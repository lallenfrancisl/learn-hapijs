import Hapi from "@hapi/hapi";
import status from "./plugins/status";

const server: Hapi.Server = Hapi.server({
  port: process.env.PORT || 3000,
  host: process.env.HOST || "localhost",
});

export async function createServer(): Promise<Hapi.Server> {
  await server.register([status]);
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

