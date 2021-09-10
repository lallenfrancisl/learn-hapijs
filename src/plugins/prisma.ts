import { PrismaClient } from "@prisma/client";
import Hapi from "@hapi/hapi";

// TODO: TBH this is weird, search for alternatives to module
// augmentation
declare module "@hapi/hapi" {
  interface ServerApplicationState {
    prisma: PrismaClient;
  }
}

const prismaPlugin: Hapi.Plugin<null> = {
  name: "prisma",
  register: async (server: Hapi.Server) => {
    const prisma = new PrismaClient();

    server.app.prisma = prisma;

    // Related issue: https://github.com/hapijs/hapi/issues/2839
    // stop the prisma client after the server is stopped
    server.ext({
      type: "onPostStop",
      method: async (server: Hapi.Server) => {
        server.app.prisma.$disconnect();
      },
    });
  },
};

export default prismaPlugin;
