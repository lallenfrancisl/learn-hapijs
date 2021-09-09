import { PrismaClient } from "@prisma/client";
import { add } from "date-fns";

const prisma = new PrismaClient();

// A `main` function so that we can use async/await
async function main() {
  await prisma.testResult.deleteMany({});
  await prisma.courseEnrollment.deleteMany({});
  await prisma.test.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.course.deleteMany({});

  const clinjo = await prisma.user.create({
    data: {
      email: "clinjo@example.com",
      firstName: "clinjo",
      lastName: "delhi",
      social: {
        facebook: "clinjofromdelhi",
        twitter: "clinjofromdelhi",
      },
    },
  });
  const weekFromNow = add(new Date(), { days: 7 });
  const twoWeekFromNow = add(new Date(), { days: 14 });
  const monthFromNow = add(new Date(), { days: 28 });

  const course = await prisma.course.create({
    data: {
      name: "CRUD with Prisma",
      courseDetails:
        "This is a course to teach everyone build crud apps with prisma",
      tests: {
        create: [
          {
            date: weekFromNow,
            name: "First test",
          },
          {
            date: twoWeekFromNow,
            name: "Second test",
          },
          {
            date: monthFromNow,
            name: "Final exam",
          },
        ],
      },
    },
    members: {
      create: {
        role: "TEACHER",
        user: {
          connect: {
            email: clinjo.email,
          },
        },
      },
    },
    include: {
      tests: true,
    },
  });

  const shakuntala = await prisma.user.create({
    data: {
      email: "devi@prisma.io",
      firstName: "Shakuntala",
      lastName: "Devi",
      courses: {
        role: "STUDENT",
        create: {
          course: {
            connect: { id: course.id },
          },
        },
      },
    },
  });

  const david = await prisma.user.create({
    data: {
      email: "david@prisma.io",
      firstName: "David",
      lastName: "Deutsch",
      courses: {
        create: {
          role: "STUDENT",
          course: {
            connect: { id: course.id },
          },
        },
      },
    },
  });

  const testResultsDavid = [650, 900, 950];
  const testResultsShakuntala = [800, 950, 910];

  let counter = 0;
  for (const test of course.tests) {
    await prisma.testResult.create({
      data: {
        gradedBy: {
          connect: { email: clinjo.email },
        },
        student: {
          connect: { email: shakuntala.email },
        },
        test: {
          connect: { id: test.id },
        },
        result: testResultsShakuntala[counter],
      },
    });

    await prisma.testResult.create({
      data: {
        gradedBy: {
          connect: { email: clinjo.email },
        },
        student: {
          connect: { email: david.email },
        },
        test: {
          connect: { id: test.id },
        },
        result: testResultsDavid[counter],
      },
    });

    counter += 1;
  }
}

main()
  .catch((e: Error) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Disconnect Prisma Client
    await prisma.$disconnect();
  });
