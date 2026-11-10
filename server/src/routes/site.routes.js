import { Router } from 'express'
import multer from 'multer'
import { env } from '../config/env.js'
import { validate } from '../middlewares/validate.middleware.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { idParam, previewPostSchema, saveCaseSchema, savePostSchema } from '../schemas/site.schema.js'
import { uploadMedia, listMedia, removeMedia } from '../services/media.service.js'
import * as posts from '../services/site/post.service.js'
import * as cases from '../services/site/case.service.js'

/** Контент сайта: статьи, кейсы, медиатека. Только админ. */
const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.maxVideoBytes, files: 1 } })

router.use(authenticate, authorize('admin'))

router.get('/media', asyncHandler(async (req, res) => res.json(await listMedia())))
router.post('/media', upload.single('file'), asyncHandler(async (req, res) => {
  res.status(201).json(await uploadMedia(req.file, req.body))
}))
router.delete('/media/:id', validate(idParam), asyncHandler(async (req, res) => {
  await removeMedia(req.params.id)
  res.status(204).send()
}))

router.get('/posts', asyncHandler(async (req, res) => res.json(await posts.listPosts())))
router.post('/posts/preview', validate(previewPostSchema), (req, res) => res.json(posts.previewArticle(req.body.body)))
router.get('/posts/:id', validate(idParam), asyncHandler(async (req, res) => res.json(await posts.getPost(req.params.id))))
router.post('/posts', validate(savePostSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await posts.savePost(null, req.body))
}))
router.put('/posts/:id', validate(savePostSchema), asyncHandler(async (req, res) => {
  res.json(await posts.savePost(req.params.id, req.body))
}))
router.delete('/posts/:id', validate(idParam), asyncHandler(async (req, res) => {
  await posts.removePost(req.params.id)
  res.status(204).send()
}))

router.get('/cases', asyncHandler(async (req, res) => res.json(await cases.listCases())))
router.get('/cases/:id', validate(idParam), asyncHandler(async (req, res) => res.json(await cases.getCase(req.params.id))))
router.post('/cases', validate(saveCaseSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await cases.saveCase(null, req.body))
}))
router.put('/cases/:id', validate(saveCaseSchema), asyncHandler(async (req, res) => {
  res.json(await cases.saveCase(req.params.id, req.body))
}))
router.delete('/cases/:id', validate(idParam), asyncHandler(async (req, res) => {
  await cases.removeCase(req.params.id)
  res.status(204).send()
}))

export default router
