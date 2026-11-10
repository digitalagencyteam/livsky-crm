import { Router } from 'express'
import authRoutes from './auth.routes.js'
import clientRoutes from './client.routes.js'
import boardRoutes from './board.routes.js'
import contractRoutes from './contract.routes.js'
import leadRoutes from './lead.routes.js'
import siteRoutes from './site.routes.js'

/** API админки. Публичное API сайта — отдельно, в public.routes.js. */
const router = Router()

router.use('/auth', authRoutes)
router.use('/clients', clientRoutes)
router.use('/board', boardRoutes)
router.use('/contracts', contractRoutes)
router.use('/leads', leadRoutes)
router.use('/site', siteRoutes)

export default router
