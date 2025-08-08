import express, { Request, Response } from 'express'
import cors from 'cors'

const app = express()

const SWA_ORIGIN = 'https://brave-bay-0bfacc110-production.centralus.6.azurestaticapps.net'

app.use(cors({
  origin: SWA_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}))

app.use(express.json())

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true })
})

app.get('/api/module/:slug', (req: Request, res: Response) => {
  const { slug } = req.params as { slug: string }
  res.json({ slug })
})

app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

export default app
