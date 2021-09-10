import Hapi from "@hapi/hapi";
import status from "./plugins/status";
import prismaPlugin from "./plugins/prisma";
import usersPlugin from "./plugins/users";

const server: Hapi.Server = Hapi.server({
  port: process.env.PORT || 3000,
  host: process.env.HOST || "localhost",
  router: {
    stripTrailingSlash: true,
  }
});

export async function createServer(): Promise<Hapi.Server> {
  await server.register([status, prismaPlugin, usersPlugin]);
  await server.initialize();

  return server;
}

export async function startServer(server: Hapi.Server): Promise<Hapi.Server> {
  await server.start();
  console.log(`server running on ${server.info.uri}`);

  return server;
}

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});
