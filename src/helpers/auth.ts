import Hapi from '@hapi/hapi';
import { forbidden } from '@hapi/boom';

export async function isRequestedUserOrAdmin(req: Hapi.Request, h: Hapi.ResponseToolkit) {
  const { userId, isAdmin } = req.auth.credentials;

  if (isAdmin) {
    return h.continue;
  }

  const requestedUserId = parseInt(req.params.userId, 10);
  if (requestedUserId === userId) return h.continue;

  throw forbidden();
}

export async function  isTeacherOfCourseOrAdmin(req: Hapi.Request, h: Hapi.ResponseToolkit) {
  const { isAdmin, teacherOf } = req.auth.credentials;

  if (isAdmin) {
    return h.continue;
  }

  const courseId = parseInt(req.params.courseId, 10);

  if ((teacherOf as number[])?.includes(courseId)) {
    return h.continue;
  }

  throw forbidden();
}
