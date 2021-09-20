import Hapi from '@hapi/hapi';
import { TokenType, UserRole } from '@prisma/client';
import Joi from 'joi';
import { AuthenticateInput, LoginInput, APITokenPayload, JWT_SECRET, API_AUTH_STRATEGY, JWT_ALGORITHM, EMAIL_TOKEN_EXP_MINS, AUTH_TOKEN_EXP_HOURS } from '../models/Auth';
import { unauthorized, badImplementation } from '@hapi/boom';
import { add } from 'date-fns';
import jwt from 'jsonwebtoken';

const authPlugin: Hapi.Plugin<null> = {
  name: 'app/auth',
  dependencies: ['prisma', 'hapi-auth-jwt2', 'app/email'],
  register: async function (server: Hapi.Server) {
    server.route([
      {
        method: 'POST',
        path: '/login',
        handler: loginHandler,
        options: {
          auth: false,
          validate: {
            payload: Joi.object({
              email: Joi.string().email().required(),
            }),
          },
        },
      },
      {
        method: 'POST',
        path: '/auth',
        handler: authHandler,
        options: {
          auth: false,
          validate: {
            payload: Joi.object({
              email: Joi.string().email().required(),
              emailToken: Joi.string().required(),
            }),
          },
        },
      },
    ]);

    server.auth.strategy(API_AUTH_STRATEGY, 'jwt', {
      key: JWT_SECRET,
      verifyOptions: { algorithms: [JWT_ALGORITHM] },
      validate: validateApiToken,
    });

    server.auth.default(API_AUTH_STRATEGY);
  },
};

const apiTokenSchema = Joi.object({
  tokenId: Joi.number().integer().required(),
});

async function validateApiToken(
  decoded: APITokenPayload,
  req: Hapi.Request,
  _: Hapi.ResponseToolkit
) {
  const { prisma } = req.server.app;
  const { tokenId } = decoded;
  const { error } = apiTokenSchema.validate(decoded);

  if (error) {
    req.log(['error', 'auth'], `API token error: ${error.message}`);
    return { isValid: false };
  }

  try {
    const fetchedToken = await prisma.token.findUnique({
      where: {
        id: tokenId,
      },
      include: {
        user: true,
      },
    });

    if (!(fetchedToken?.valid || fetchedToken?.valid)) {
      return { isValid: false, errorMessage: 'Invalid token' };
    }

    const teacherOfCourses = await prisma.courseEnrollment.findMany({
      where: {
        userId: fetchedToken.userId,
        role: UserRole.TEACHER,
      },
      select: {
        courseId: true,
      },
    });

    return {
      isValid: true,
      credentials: {
        tokenId: decoded.tokenId,
        userId: fetchedToken.userId,
        isAdmin: fetchedToken.user.isAdmin,
        teacherOf: teacherOfCourses.map((course: any) => course.courseId),
      },
    };
  } catch (err) {
    req.log(['error', 'auth', 'db'], error);
    return { isValid: false };
  }
}

async function loginHandler(req: Hapi.Request, h: Hapi.ResponseToolkit) {
  const { prisma, sendEmailToken } = req.server.app;
  const { email } = req.payload as LoginInput;
  const emailToken = generateEmailToken();
  const tokenExpiration = add(new Date(), { minutes: EMAIL_TOKEN_EXP_MINS });

  try {
    await prisma.token.create({
      data: {
        emailToken,
        type: TokenType.EMAIL,
        expiration: tokenExpiration,
        user: {
          // this is a function such that it either connects to
          // existing user with the email or creates a new user
          // with the email
          connectOrCreate: {
            create: {
              email,
            },
            where: {
              email,
            },
          },
        },
      },
    });

    // send the created email token
    await sendEmailToken(email, emailToken);

    return h.response().code(200);
  } catch (err) {
    console.error(err);
    return badImplementation();
  }
}

// Generate a random 8 digit number as the email token
function generateEmailToken(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

async function authHandler(req: Hapi.Request, h: Hapi.ResponseToolkit) {
  const { prisma } = req.server.app;
  const { email, emailToken } = req.payload as AuthenticateInput;

  try {
    const fetchedEmailToken = await prisma.token.findUnique({
      where: {
        emailToken: emailToken,
      },
      include: {
        user: true,
      },
    });

    if (!fetchedEmailToken?.valid) {
      return unauthorized();
    }

    if (fetchedEmailToken.expiration < new Date()) {
      return unauthorized('Token expired');
    }

    if (fetchedEmailToken?.user?.email === email) {
      const tokenExpiration = add(new Date(), {
        hours: AUTH_TOKEN_EXP_HOURS,
      });

      const createdToken = await prisma.token.create({
        data: {
          type: TokenType.API,
          expiration: tokenExpiration,
          user: {
            connect: {
              email,
            },
          },
        },
      });

      // the email token must be invalidated after it is used
      //
      await prisma.token.update({
        where: {
          id: fetchedEmailToken.id,
        },
        data: {
          valid: false,
        },
      });

      const authToken = generateAuthToken(createdToken.id);
      return h.response().code(200).header('Authorization', authToken);
    }

    return unauthorized();
  } catch (err) {
    console.error(err);
    return badImplementation();
  }
}

// Generate a signed JWT token with the tokenId in the payload
function generateAuthToken(tokenId: number): string {
  const jwtPayload = { tokenId };

  return jwt.sign(jwtPayload, JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    noTimestamp: true,
  });
}

export default authPlugin;
