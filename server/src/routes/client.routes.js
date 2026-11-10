import { Router } from 'express'
import { validate } from '../middlewares/validate.middleware.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { createClientSchema, updateClientSchema, clientIdParamSchema } from '../schemas/client.schema.js'
import * as clientController from '../controllers/client.controller.js'

const router = Router()

router.use(authenticate, authorize('admin'))

router.get('/', clientController.listClients)
router.post('/', validate(createClientSchema), clientController.createClient)
router.patch('/:id', validate(updateClientSchema), clientController.updateClient)
router.delete('/:id', validate(clientIdParamSchema), clientController.deleteClient)

export default router
