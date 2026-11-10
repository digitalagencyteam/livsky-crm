import { z } from 'zod'
import { objectId } from './common.js'

/** Заявка с сайта. Поля формы — как в contactSchema сайта, плюс бронь звонка. */
export const publicLeadSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    contact: z.string().trim().min(3).max(120),
    message: z.string().trim().max(4000).default(''),
    needs: z.array(z.string().trim().max(20)).max(10).default([]),
    kind: z.enum(['form', 'call']).default('form'),
    callAt: z.string().datetime({ offset: true }).optional(),
    platform: z.string().trim().max(40).optional(),
    page: z.string().trim().max(300).optional(),
    locale: z.enum(['ru', 'en']).optional(),
    // Ловушка для ботов: поле скрыто от людей
    website: z.string().max(200).optional(),
  }),
})

export const listLeadsSchema = z.object({
  query: z.object({
    status: z.enum(['new', 'in_work', 'done', 'spam']).optional(),
    kind: z.enum(['form', 'call']).optional(),
    q: z.string().trim().max(200).optional(),
  }),
})

export const updateLeadSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({ status: z.enum(['new', 'in_work', 'done', 'spam']), note: z.string().trim().max(5000) })
    .partial(),
})
