import { AuthCredentials } from '@hapi/hapi';
import { PrismaClient, TokenType } from '@prisma/client';
import { add } from 'date-fns';

export const createUserCredentials = async (
  prisma: PrismaClient,
  isAdmin: boolean
): Promise<AuthCredentials> => {
  const testUser = await prisma.user.create({
    data: {
      email: `test-${Date.now()}@email.com`,
      isAdmin,
      tokens: {
        create: {
          type: TokenType.API,
          expiration: add(new Date(), { days: 7 }),
        },
      },
    },
    include: {
      tokens: true,
    },
  });

  return {
    tokenId: testUser.tokens[0].id,
    userId: testUser.id,
    isAdmin: testUser.isAdmin,
    teacherOf: [],
  };
};
