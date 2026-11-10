import { Router } from 'express'
import { validate } from '../middlewares/validate.middleware.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { idSchema } from '../schemas/contract.schema.js'
import { listLeadsSchema, updateLeadSchema } from '../schemas/lead.schema.js'
import * as leads from '../services/lead.service.js'

const router = Router()
router.use(authenticate, authorize('admin'))

router.get('/', validate(listLeadsSchema), asyncHandler(async (req, res) => res.json(await leads.listLeads(req.query))))
router.get('/new-count', asyncHandler(async (req, res) => res.json(await leads.newCount())))
router.patch('/:id', validate(updateLeadSchema), asyncHandler(async (req, res) => {
  res.json(await leads.updateLead(req.params.id, req.body))
}))
router.delete('/:id', validate(idSchema), asyncHandler(async (req, res) => {
  await leads.removeLead(req.params.id)
  res.status(204).send()
}))

export default router
