import Hapi from '@hapi/hapi';
import { TokenType } from '@prisma/client';
import Joi from '@hapi/joi';
import { AuthenticateInput, LoginInput } from '../models/Auth';
import { unauthorized, badImplementation } from '@hapi/boom';
import { add } from 'date-fns';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'JWT_SECRET';
const JWT_ALGORITHM = 'HS256';
const AUTH_TOKEN_EXP_HOURS = 12;

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

export default authPlugin;
