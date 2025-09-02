import { z } from 'zod'

export const visitStatusEnum = z.enum(['PLANNED', 'IN_PROGRESS', 'VISITED'])

export const streetQuerySchema = z.object({
  search: z.string().optional(),
  status: visitStatusEnum.optional(),
  hasPhotos: z.coerce.boolean().optional(),
  hasNotes: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  bbox: z
    .string()
    .regex(/^(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*)$/)
    .optional()
})

export type StreetQuery = z.infer<typeof streetQuerySchema>
