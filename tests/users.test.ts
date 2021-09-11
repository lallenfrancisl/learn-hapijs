import { createServer } from '../src/server';
import Hapi from '@hapi/hapi';

describe('ROUTE /users/', () => {
  let server: Hapi.Server;

  beforeAll(async () => {
    server = await createServer();
  });

  afterAll(async () => {
    server.stop();
  });

  let userId: number;

  // test if create user works
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

  // test if create user data validation works
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

  // test if getting a user that does not exist returns 404
  test('get non-existent user details', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/users/99999999',
    });

    expect(response.statusCode).toEqual(404);
  });

  // test if getting an existing user returns the user details
  test('get user details', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/users/${userId}`,
    });

    expect(response.statusCode).toEqual(200);

    const user = JSON.parse(response.payload);
    expect(user.id).toBe(userId);
  });
});
