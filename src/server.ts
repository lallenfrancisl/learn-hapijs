import Hapi from "@hapi/hapi";
import status from "./plugins/status";
import prismaPlugin from "./plugins/prisma";
import usersPlugin from "./plugins/users";
import emailPlugin from "./plugins/email";
import hapiAuthJWT from 'hapi-auth-jwt2';
import authPlugin from "./plugins/auth";

const server: Hapi.Server = Hapi.server({
  port: process.env.PORT || 3000,
  host: process.env.HOST || "localhost",
  router: {
    stripTrailingSlash: true,
  }
});

export async function createServer(): Promise<Hapi.Server> {
  await server.register([status, prismaPlugin, usersPlugin, emailPlugin, hapiAuthJWT, authPlugin]);
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
