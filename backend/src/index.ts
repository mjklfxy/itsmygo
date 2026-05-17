import { KataGoManager } from './katago'
import { handleRequest } from './routes'

const katago = new KataGoManager()

const server = Bun.serve({
  port: 3001,
  fetch: (req) => handleRequest(req, katago),
})

console.log(`Backend running on http://localhost:${server.port}`)
