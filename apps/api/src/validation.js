import { z } from 'zod';
import { HttpError } from './errors.js';

const nullableText = (max) => z.string().trim().max(max).nullable().optional();
const nullableDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date in YYYY-MM-DD format.')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Invalid date.')
  .transform((value) => new Date(`${value}T00:00:00.000Z`))
  .nullable()
  .optional();
const nullableBoolean = z.boolean().nullable().optional();
const nullableCount = z.number().int().min(0).max(1000).nullable().optional();

const studentFields = {
  applicationNumber: z.string().trim().min(1).max(100).transform((value) => value.toUpperCase()),
  parentId: z.string().uuid().nullable().optional(),
  dateOfAdmission: nullableDate,
  admissionSoughtIn: nullableText(100),
  class: nullableText(100),
  section: nullableText(100),
  rollNumber: nullableText(100),
  firstName: z.string().trim().min(1).max(200),
  surname: nullableText(200),
  nameUsedAtHome: nullableText(200),
  gender: nullableText(100),
  dateOfBirth: nullableDate,
  languageSpokenAtHome: nullableText(200),
  address: nullableText(10000),
  fatherName: nullableText(300),
  fatherEducationQualification: nullableText(300),
  fatherOccupation: nullableText(300),
  fatherMobileNumber: nullableText(32),
  motherName: nullableText(300),
  motherEducationQualification: nullableText(300),
  motherOccupation: nullableText(300),
  motherMobileNumber: nullableText(32),
  previousSchooling: nullableBoolean,
  previousSchoolingDetails: nullableText(10000),
  toiletTrained: nullableBoolean,
  brothersCount: nullableCount,
  sistersCount: nullableCount,
  photoLocator: nullableText(1024),
  status: z.enum(['Applied', 'Pending', 'Admitted', 'Rejected']),
};

export const createStudentSchema = z.object({
  applicationNumber: studentFields.applicationNumber,
  firstName: studentFields.firstName,
  parentId: studentFields.parentId,
  dateOfAdmission: studentFields.dateOfAdmission,
  admissionSoughtIn: studentFields.admissionSoughtIn,
  class: studentFields.class,
  section: studentFields.section,
  rollNumber: studentFields.rollNumber,
  surname: studentFields.surname,
  nameUsedAtHome: studentFields.nameUsedAtHome,
  gender: studentFields.gender,
  dateOfBirth: studentFields.dateOfBirth,
  languageSpokenAtHome: studentFields.languageSpokenAtHome,
  address: studentFields.address,
  fatherName: studentFields.fatherName,
  fatherEducationQualification: studentFields.fatherEducationQualification,
  fatherOccupation: studentFields.fatherOccupation,
  fatherMobileNumber: studentFields.fatherMobileNumber,
  motherName: studentFields.motherName,
  motherEducationQualification: studentFields.motherEducationQualification,
  motherOccupation: studentFields.motherOccupation,
  motherMobileNumber: studentFields.motherMobileNumber,
  previousSchooling: studentFields.previousSchooling,
  previousSchoolingDetails: studentFields.previousSchoolingDetails,
  toiletTrained: studentFields.toiletTrained,
  brothersCount: studentFields.brothersCount,
  sistersCount: studentFields.sistersCount,
  photoLocator: studentFields.photoLocator,
  status: studentFields.status.default('Applied'),
}).strict();

const editableStudentFields = Object.fromEntries(
  Object.entries(studentFields).map(([key, schema]) => [key, schema.optional()])
);

export const editStudentSchema = z.object({
  basedOnRevisionId: z.string().uuid(),
  changes: z.object(editableStudentFields).strict().refine(
    (changes) => Object.keys(changes).length > 0,
    'At least one student field must be provided.'
  ),
}).strict();

export const lifecycleSchema = z.object({
  lifecycleStatus: z.literal('Inactive'),
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(1024),
}).strict();

export const uuidParamSchema = z.string().uuid();

export function parseOrThrow(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Please correct the submitted information.');
  }
  return result.data;
}
