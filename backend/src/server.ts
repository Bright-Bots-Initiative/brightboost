import express from 'express'
import type { Request, Response } from 'express'
import cors from 'cors'
import modulesRouter from './routes/modules'
import progressRouter from './routes/progress'
import classesRouter from './routes/classes'
import { devRoleShim } from './utils/auth'

const app = express()
app.use(cors())
app.use(express.json())
app.use(devRoleShim)

app.use('/api', modulesRouter)
app.use('/api', progressRouter)
app.use('/api', classesRouter)

app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }))

const port = process.env.PORT ? Number(process.env.PORT) : 3000
if (process.env.NODE_ENV !== 'test') {
  app.listen(port)
}

export default app
