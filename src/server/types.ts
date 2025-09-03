import { z } from 'zod'
import { visitStatusEnum } from '@/lib/validators'

export const streetListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  segments: z.number(),
  photos: z.number(),
  notes: z.number(),
  lastStatus: visitStatusEnum.nullable(),
  updatedAt: z.string()
})

export type StreetListItem = z.infer<typeof streetListItemSchema>

export const streetDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  osmId: z.string(),
  geometry: z.any().nullable(),
  segments: z.array(
    z.object({ id: z.string(), osmId: z.string(), geometry: z.any(), updatedAt: z.string() })
  ),
  photos: z.array(
    z.object({
      id: z.string(),
      url: z.string().url(),
      createdAt: z.string(),
      width: z.number().nullable().optional(),
      height: z.number().nullable().optional(),
      noteId: z.string().nullable().optional(),
      lng: z.number().nullable().optional(),
      lat: z.number().nullable().optional()
    })
  ),
  notes: z.array(z.object({ id: z.string(), content: z.string(), tags: z.array(z.string()), createdAt: z.string() })),
  lastStatus: visitStatusEnum.nullable()
})

export type StreetDetail = z.infer<typeof streetDetailSchema>
