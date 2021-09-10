import Hapi from '@hapi/hapi';
import Joi from '@hapi/joi';
import { UserInput } from '../models/User';

const userInputValidator = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  social: Joi.object({
    facebook: Joi.string().optional(),
    twitter: Joi.string().optional(),
    github: Joi.string().optional(),
    website: Joi.string().optional(),
  }).optional(),
});

// plugin to instantiate Prisma Client
const usersPlugin: Hapi.Plugin<null> = {
  name: 'app/users',
  dependencies: ['prisma'],
  register: async (server: Hapi.Server) => {
    server.route([
      {
        method: 'POST',
        path: '/users',
        handler: createUserHandler,
        options: {
          validate: {
            payload: userInputValidator,
          },
        },
      },
    ]);
  },
};

async function createUserHandler(req: Hapi.Request, h: Hapi.ResponseToolkit) {
  const prisma = req.server.app.prisma;
  const payload = req.payload as UserInput;

  try {
    const createdUser = await prisma.user.create({
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        social: JSON.stringify(payload.social),
      },
      // specify the fields that you want to be included
      // in the response
      select: {
        id: true,
      },
    });

    return h
      .response({
        status: 'success',
        data: createdUser,
      })
      .code(201);
  } catch (error) {
    console.error(error);
    return h.response({ status: 'fail' });
  }
}

export default usersPlugin;
