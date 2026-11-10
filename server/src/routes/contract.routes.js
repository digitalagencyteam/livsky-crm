import { Router } from 'express'
import multer from 'multer'
import { env } from '../config/env.js'
import { validate } from '../middlewares/validate.middleware.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import * as schema from '../schemas/contract.schema.js'
import * as contracts from '../services/contract.service.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.maxContractBytes, files: 1 } })

router.use(authenticate, authorize('admin'))

router.get('/', validate(schema.listContractsSchema), asyncHandler(async (req, res) => {
  res.json(await contracts.listContracts(req.query))
}))
router.post('/', validate(schema.createContractSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await contracts.createContract(req.body))
}))
router.get('/:id', validate(schema.idSchema), asyncHandler(async (req, res) => {
  res.json(await contracts.getContract(req.params.id))
}))
router.patch('/:id', validate(schema.updateContractSchema), asyncHandler(async (req, res) => {
  res.json(await contracts.updateContract(req.params.id, req.body))
}))
router.delete('/:id', validate(schema.idSchema), asyncHandler(async (req, res) => {
  await contracts.removeContract(req.params.id)
  res.status(204).send()
}))

router.post('/:id/files', upload.single('file'), validate(schema.uploadQuerySchema), asyncHandler(async (req, res) => {
  res.status(201).json(await contracts.uploadFile(req.params.id, req.file, req.query.kind))
}))

// Файл отдаётся через сервер после входа: прямой ссылки на договор не существует
router.get('/files/:id', validate(schema.idSchema), asyncHandler(async (req, res) => {
  const { file, stream } = await contracts.openFile(req.params.id)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`)
  res.setHeader('Cache-Control', 'private, no-store')
  stream.on('error', () => res.destroy())
  stream.pipe(res)
}))
router.delete('/files/:id', validate(schema.idSchema), asyncHandler(async (req, res) => {
  await contracts.removeFile(req.params.id)
  res.status(204).send()
}))

export default router
