import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { HttpError, notFoundError } from './errors.js';

const currentRevisionSelection = {
  id: true,
  revisionNumber: true,
  applicationNumber: true,
  firstName: true,
  surname: true,
  class: true,
  section: true,
  dateOfAdmission: true,
  status: true,
};

function mapRevision(revision) {
  if (!revision) throw notFoundError();
  return {
    id: revision.id,
    studentId: revision.studentId,
    revisionNumber: revision.revisionNumber,
    basedOnRevisionId: revision.basedOnRevisionId,
    applicationNumber: revision.applicationNumber,
    parentId: revision.parentId,
    dateOfAdmission: revision.dateOfAdmission,
    admissionSoughtIn: revision.admissionSoughtIn,
    class: revision.class,
    section: revision.section,
    rollNumber: revision.rollNumber,
    firstName: revision.firstName,
    surname: revision.surname,
    nameUsedAtHome: revision.nameUsedAtHome,
    gender: revision.gender,
    dateOfBirth: revision.dateOfBirth,
    languageSpokenAtHome: revision.languageSpokenAtHome,
    address: revision.address,
    fatherName: revision.fatherName,
    fatherEducationQualification: revision.fatherEducationQualification,
    fatherOccupation: revision.fatherOccupation,
    fatherMobileNumber: revision.fatherMobileNumber,
    motherName: revision.motherName,
    motherEducationQualification: revision.motherEducationQualification,
    motherOccupation: revision.motherOccupation,
    motherMobileNumber: revision.motherMobileNumber,
    previousSchooling: revision.previousSchooling,
    previousSchoolingDetails: revision.previousSchoolingDetails,
    toiletTrained: revision.toiletTrained,
    brothersCount: revision.brothersCount,
    sistersCount: revision.sistersCount,
    photoLocator: revision.photoLocator,
    status: revision.status,
    createdOn: revision.createdOn,
    createdByAdminId: revision.createdByAdminId,
  };
}

function mapStudent(student, revision) {
  return {
    id: student.id,
    lifecycleStatus: student.lifecycleStatus,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
    currentRevision: mapRevision(revision),
  };
}

function isUniqueConstraintError(error) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function normalizeDatabaseError(error) {
  if (isUniqueConstraintError(error)) {
    throw new HttpError(409, 'APPLICATION_NUMBER_CONFLICT', 'An active record already uses this application number.');
  }
  throw error;
}

export async function listStudents(prisma, filters) {
  const where = {};
  if (filters.lifecycle !== 'All') where.lifecycleStatus = filters.lifecycle;
  if (filters.status) {
    where.currentRevision = { is: { status: filters.status } };
  }
  if (filters.search) {
    const contains = { contains: filters.search, mode: 'insensitive' };
    where.OR = [
      { currentApplicationNumber: contains },
      { currentRevision: { is: { firstName: contains } } },
      { currentRevision: { is: { surname: contains } } },
    ];
  }

  const [total, students] = await prisma.$transaction([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: [{ currentApplicationNumber: 'asc' }, { id: 'asc' }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        currentApplicationNumber: true,
        lifecycleStatus: true,
        updatedAt: true,
        currentRevision: { select: currentRevisionSelection },
      },
    }),
  ]);

  return {
    items: students.map((student) => ({
      id: student.id,
      currentApplicationNumber: student.currentApplicationNumber,
      lifecycleStatus: student.lifecycleStatus,
      updatedAt: student.updatedAt,
      ...student.currentRevision,
      id: student.id,
      currentRevisionId: student.currentRevision.id,
    })),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.ceil(total / filters.pageSize),
    },
  };
}

export async function getStudent(prisma, studentId) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { currentRevision: true },
  });
  if (!student) throw notFoundError();
  return mapStudent(student, student.currentRevision);
}

export async function createStudent(prisma, adminId, data) {
  const studentId = randomUUID();
  const revisionId = randomUUID();
  const revisionData = {
    ...data,
    status: data.status ?? 'Applied',
    revisionNumber: 1,
    basedOnRevisionId: null,
    createdByAdminId: adminId,
  };

  try {
    const student = await prisma.$transaction(async (transaction) => {
      await transaction.student.create({
        data: {
          id: studentId,
          currentRevisionId: revisionId,
          currentApplicationNumber: data.applicationNumber,
          lifecycleStatus: 'Active',
        },
      });
      await transaction.studentRevision.create({
        data: { id: revisionId, studentId, ...revisionData },
      });
      return transaction.student.findUnique({
        where: { id: studentId },
        include: { currentRevision: true },
      });
    });
    return mapStudent(student, student.currentRevision);
  } catch (error) {
    normalizeDatabaseError(error);
  }
}

export async function editStudent(prisma, adminId, studentId, basedOnRevisionId, changes) {
  try {
    return await prisma.$transaction(async (transaction) => {
      const [student] = await transaction.$queryRaw`
        SELECT "id", "currentRevisionId", "currentApplicationNumber", "lifecycleStatus"
        FROM "students"
        WHERE "id" = ${studentId}::uuid
        FOR UPDATE
      `;
      if (!student) throw notFoundError();

      const baseRevision = await transaction.studentRevision.findFirst({
        where: { id: basedOnRevisionId, studentId },
      });
      if (!baseRevision) throw notFoundError();

      const currentRevisionIdAtWrite = student.currentRevisionId;
      const mergedSnapshot = {
        ...baseRevision,
        ...changes,
        applicationNumber: changes.applicationNumber ?? baseRevision.applicationNumber,
        firstName: changes.firstName ?? baseRevision.firstName,
      };
      const latestRevision = await transaction.studentRevision.aggregate({
        where: { studentId },
        _max: { revisionNumber: true },
      });
      const revisionId = randomUUID();
      const revisionNumber = (latestRevision._max.revisionNumber ?? 0) + 1;

      const revision = await transaction.studentRevision.create({
        data: {
          ...mergedSnapshot,
          id: revisionId,
          studentId,
          revisionNumber,
          basedOnRevisionId,
          createdByAdminId: adminId,
          createdOn: new Date(),
        },
      });

      await transaction.student.update({
        where: { id: studentId },
        data: {
          currentRevisionId: revisionId,
          currentApplicationNumber: revision.applicationNumber,
        },
      });

      return {
        studentId,
        lifecycleStatus: student.lifecycleStatus,
        currentRevision: mapRevision(revision),
        staleBase: basedOnRevisionId !== currentRevisionIdAtWrite,
        previousCurrentRevisionId: currentRevisionIdAtWrite,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  } catch (error) {
    normalizeDatabaseError(error);
  }
}

export async function listStudentRevisions(prisma, studentId) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!student) throw notFoundError();

  const revisions = await prisma.studentRevision.findMany({
    where: { studentId },
    orderBy: { revisionNumber: 'desc' },
    select: {
      id: true,
      revisionNumber: true,
      basedOnRevisionId: true,
      applicationNumber: true,
      firstName: true,
      surname: true,
      status: true,
      createdOn: true,
      createdByAdminId: true,
    },
  });
  return revisions;
}

export async function getStudentRevision(prisma, studentId, revisionId) {
  const revision = await prisma.studentRevision.findFirst({
    where: { id: revisionId, studentId },
  });
  if (!revision) throw notFoundError();
  return mapRevision(revision);
}

export async function getStudentRevisionByPhotoId(prisma, studentId, photoId) {
  const revision = await prisma.studentRevision.findFirst({
    where: {
      studentId,
      photoLocator: { startsWith: `local:${photoId}.` },
    },
    orderBy: { revisionNumber: 'desc' },
  });
  if (!revision) throw notFoundError();
  return mapRevision(revision);
}

export async function attachStudentPhoto(prisma, adminId, studentId, expectedRevisionId, photoLocator) {
  return prisma.$transaction(async (transaction) => {
    const [student] = await transaction.$queryRaw`
      SELECT "id", "currentRevisionId", "lifecycleStatus"
      FROM "students"
      WHERE "id" = ${studentId}::uuid
      FOR UPDATE
    `;
    if (!student) throw notFoundError();

    const currentRevision = await transaction.studentRevision.findUnique({
      where: { id: student.currentRevisionId },
    });
    if (!currentRevision) throw notFoundError();
    const latestRevision = await transaction.studentRevision.aggregate({
      where: { studentId },
      _max: { revisionNumber: true },
    });
    const revision = await transaction.studentRevision.create({
      data: {
        ...currentRevision,
        id: randomUUID(),
        revisionNumber: (latestRevision._max.revisionNumber ?? 0) + 1,
        basedOnRevisionId: currentRevision.id,
        photoLocator,
        createdByAdminId: adminId,
        createdOn: new Date(),
      },
    });
    await transaction.student.update({
      where: { id: studentId },
      data: { currentRevisionId: revision.id },
    });
    return {
      studentId,
      lifecycleStatus: student.lifecycleStatus,
      currentRevision: mapRevision(revision),
      staleBase: expectedRevisionId !== currentRevision.id,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

export async function markStudentInactive(prisma, studentId) {
  try {
    const updated = await prisma.student.updateMany({
      where: { id: studentId },
      data: { lifecycleStatus: 'Inactive' },
    });
    if (updated.count !== 1) throw notFoundError();
    return prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, lifecycleStatus: true, currentApplicationNumber: true, updatedAt: true },
    });
  } catch (error) {
    normalizeDatabaseError(error);
  }
}
