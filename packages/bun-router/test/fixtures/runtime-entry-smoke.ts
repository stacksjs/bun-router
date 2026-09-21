import assert from 'node:assert/strict'
import process from 'node:process'

const runtime = await import(process.argv[2])
for (const name of ['Router', 'applyRequestEnhancements', 'applyResponseCompression', 'createTypedRouter', 'response', 'runWithRequest'])
  assert.equal(typeof runtime[name], name === 'Router' ? 'function' : name === 'response' ? 'object' : 'function')
if (process.argv[3] === 'narrow') {
  for (const name of ['Auth', 'Container', 'SessionManager', 'TestClient'])
    assert.equal(name in runtime, false)
}

const router = new runtime.Router()
router.get('/runtime-check', () => ({ runtime: true }))
const server = await router.serve({ hostname: '127.0.0.1', port: 0 })
try {
  const response = await fetch(`http://127.0.0.1:${server.port}/runtime-check`)
  console.log(JSON.stringify({
    status: response.status,
    contentType: response.headers.get('content-type'),
    body: await response.text(),
    methods: Object.getOwnPropertyNames(runtime.Router.prototype).sort(),
  }))
}
finally {
  server.stop(true)
}
