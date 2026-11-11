import { z } from 'zod'

export const uuidSchema = z.string().uuid('Must be a valid UUID')

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date in YYYY-MM-DD format')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`)
    // Round-tripping rejects rolled-over dates such as 2026-02-30.
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, 'Invalid calendar date')

export const periodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Must be a month in YYYY-MM format')

/** ISO-8601 date/time. Accepts a date without a timezone and normalises it. */
export const dateTimeSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Must be a valid date/time')

export const idParamSchema = z.object({ id: uuidSchema })

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.string().max(64).optional(),
})

export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value))

export const optionalDate = z
  .union([dateOnlySchema, z.literal(''), z.null()])
  .optional()
  .transform((value) => (value === '' || value === null ? undefined : value))

export const optionalUuid = z
  .union([uuidSchema, z.literal(''), z.null()])
  .optional()
  .transform((value) => (value === '' || value === null ? undefined : value))

export const moneySchema = z.coerce.number().finite().min(0).max(1_000_000_000)

export const positiveMoneySchema = z.coerce.number().finite().positive().max(1_000_000_000)

export const percentageSchema = z.coerce.number().finite().min(0).max(100)

export const decisionSchema = z.enum(['Approved', 'Rejected', 'Changes Requested', 'Cancelled'])
