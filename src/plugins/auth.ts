import Hapi from '@hapi/hapi';
import { TokenType } from '@prisma/client';
import Joi from '@hapi/joi';
import { AuthenticateInput, LoginInput } from '../models/Auth';
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
  },
};

const EMAIL_TOKEN_EXP_MINS = 10;

async function loginHandler(req: Hapi.Request, h: Hapi.ResponseToolkit) {
  const { prisma, sendEmailToken } = req.server.app;
  const { email } = req.payload as LoginInput;
  const emailToken = generateEmailToken();
  const tokenExpiration = add(new Date(), { minutes: EMAIL_TOKEN_EXP_MINS });

  try {
    const createdToken = await prisma.token.create({
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

const JWT_SECRET = process.env.JWT_SECRET || 'JWT_SECRET';
const JWT_ALGORITHM = 'HS256';
const AUTH_TOKEN_EXP_HOURS = 12;

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

    if (fetchedEmailToken.expiration < Date.now()) {
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
