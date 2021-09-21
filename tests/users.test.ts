import { createServer } from '../src/server';
import Hapi, { AuthCredentials } from '@hapi/hapi';
import { API_AUTH_STRATEGY } from '../src/models/Auth';
import { createUserCredentials } from '../test-helpers/auth-helpers';

describe('ROUTE /users/', () => {
  let server: Hapi.Server, testUserCreds: AuthCredentials, testAdminCreds: AuthCredentials;

  beforeAll(async () => {
    server = await createServer();
    testUserCreds = await createUserCredentials(server.app.prisma, false);
    testAdminCreds = await createUserCredentials(server.app.prisma, true);
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
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testAdminCreds,
      },
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
      url: `/users/${testUserCreds.userId}`,
      auth: {
        strategy: API_AUTH_STRATEGY,
        credentials: testUserCreds
      }
    });

    expect(response.statusCode).toEqual(200);

    const user = JSON.parse(response.payload);
    expect(user.id).toBe(testUserCreds.userId);
  });

  // test if updating a non-existent user errs
  test('update user fails with invalid userId parameter', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: `/users/22283429384`,
    });
    expect(response.statusCode).toEqual(400);
  });

  // test if updating an existing user succeeds
  test('update user', async () => {
    const updatedFirstName = 'test-first-name-UPDATED';
    const updatedLastName = 'test-last-name-UPDATED';

    const response = await server.inject({
      method: 'PUT',
      url: `/users/${userId}`,
      payload: {
        firstName: updatedFirstName,
        lastName: updatedLastName,
      },
    });
    expect(response.statusCode).toEqual(200);
    const user = JSON.parse(response.payload);
    expect(user.firstName).toEqual(updatedFirstName);
    expect(user.lastName).toEqual(updatedLastName);
  });

  // test if deleting a user that does not exist errs
  test('delete a user that does not exist', async () => {
    const res = await server.inject({
      method: 'DELETE',
      url: `/users/9999999999`,
    });

    expect(res.statusCode).toEqual(400);
  });

  // test if deleting a user that exist executes successfully
  test('delete a user that exist', async () => {
    const res = await server.inject({
      method: 'DELETE',
      url: `/users/${userId}`,
    });

    expect(res.statusCode).toEqual(204);
  });
});
