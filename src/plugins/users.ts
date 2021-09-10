import Hapi from '@hapi/hapi';

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
        social: payload.social,
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

export interface UserInput {
  firstName: string;
  lastName: string;
  email: string;
  social: {
    facebook?: string;
    twitter?: string;
    github?: string;
    website?: string;
  };
}

export default usersPlugin;
