import { createServer } from '../src/server';
import Hapi from '@hapi/hapi';

describe('POST /users - register user', () => {
  let server: Hapi.Server;

  beforeAll(async () => {
    server = await createServer();
  });

  afterAll(async () => {
    server.stop();
  });

  let userId: number;

  // test if the route works
  test('create user', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/users',
      payload: {
        firstName: 'test-first-name',
        lastName: 'test-last-name',
        email: `test-${Date.now()}@prisma.io`,
        social: {
          twitter: 'thisisalice',
          website: 'https://www.thisisalice.com',
        },
      },
    });

    expect(res.statusCode).toEqual(201);
    userId = JSON.parse(res.payload).data?.id;
    expect(typeof userId === 'number').toBeTruthy();
  });

  // test if data validation works
  test('register user validation', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/users',
      payload: {
        lastName: 'test-last-name',
        email: `test-${Date.now()}@prisma.io`,
        social: {
          twitter: 'thisisalice',
          website: 'https://www.thisisalice.com',
        },
      },
    });

    expect(response.statusCode).toEqual(400);
  });
});
