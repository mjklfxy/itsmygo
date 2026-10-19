import { KataGoManager } from './katago'
import { AnalysisEngine } from './analysis'
import { handleRequest } from './routes'

const katago = new KataGoManager()
const analysis = new AnalysisEngine()

const server = Bun.serve({
  port: 3001,
  fetch: (req) => handleRequest(req, katago, analysis),
})

console.log(`Backend running on http://localhost:${server.port}`)
