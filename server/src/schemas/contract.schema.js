import { z } from 'zod'
import { objectId } from './common.js'

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((v) => new Date(`${v}T00:00:00Z`))
const optionalDate = z.union([date, z.literal('').transform(() => null), z.null()]).optional()

const fields = {
  clientId: objectId.optional().nullable(),
  party: z.string().trim().min(2, 'Укажите сторону договора').max(200),
  subject: z.string().trim().max(300).optional(),
  number: z.string().trim().max(60).optional(),
  status: z.enum(['draft', 'sent', 'signed', 'terminated']).optional(),
  signedAt: optionalDate,
  startsAt: optionalDate,
  endsAt: optionalDate,
  amount: z.number().nonnegative().max(10_000_000).nullable().optional(),
  notes: z.string().trim().max(5000).optional(),
}

export const listContractsSchema = z.object({
  query: z.object({
    kind: z.enum(['client', 'employee']),
    status: z.enum(['draft', 'sent', 'signed', 'terminated']).optional(),
    q: z.string().trim().max(200).optional(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
})

export const createContractSchema = z.object({
  body: z.object({ kind: z.enum(['client', 'employee']), ...fields }),
})

export const updateContractSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object(fields).partial(),
})

export const uploadQuerySchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({ kind: z.enum(['original', 'signed', 'appendix']).default('original') }),
})

export const idSchema = z.object({ params: z.object({ id: objectId }) })
