import Hapi from '@hapi/hapi';
import Joi from '@hapi/joi';
import { UserInput } from '../models/User';
import { badImplementation, badRequest } from '@hapi/boom';
import { Prisma } from '@prisma/client';

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
      {
        method: 'GET',
        path: '/users/{userId}',
        handler: getUserHandler,
        options: {
          validate: {
            params: Joi.object({
              userId: Joi.number().integer(),
            }),
          },
        },
      },
      {
        method: 'DELETE',
        path: '/users/{userId}',
        handler: deleteUserHandler,
        options: {
          validate: {
            params: Joi.object({
              userId: Joi.number().integer(),
            }),
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
    return h.response({ status: 'fail' }).code(400);
  }
}

async function getUserHandler(req: Hapi.Request, h: Hapi.ResponseToolkit) {
  const prisma = req.server.app.prisma;
  const userId = Number(req.params.userId);

  try {
    const fetchedUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!fetchedUser) return h.response().code(404);

    return h.response(fetchedUser).code(200);
  } catch (err) {
    console.error(err);
    return badImplementation('something went wrong in the server');
  }
}

async function deleteUserHandler(req: Hapi.Request, h: Hapi.ResponseToolkit) {
  const prisma = req.server.app.prisma;
  const userId = Number(req.params.userId);

  try {
    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    return h.response().code(204);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      switch (err.code) {
        case 'P2025':
          return badRequest();
      }
    }

    console.error(err);
    return badImplementation();
  }
}

export default usersPlugin;
