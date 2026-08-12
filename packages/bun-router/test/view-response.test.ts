// What a rendered page may decide about its own response, and what it can see
// of the request.
//
// The file-based view path renders a `<script server>` block and then builds a
// Response around the HTML. Until this test it built the same Response every
// time - status 200, no page headers - and handed the script none of the
// request context stx's own `serve()` provides.
//
// Both halves fail in the direction that hides them. A page that cannot set a
// status renders its "no such record" branch under a 200, so a crawler and a
// cache take a URL naming nothing for a real page. A page that reads
// `__stxServeContext` gets a ReferenceError *inside its own IIFE*, which takes
// every other binding in the file down with it - the page then renders its
// empty branch and reads as a correct answer, with nothing reported anywhere.

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Router } from '../src/router/index'

const viewsDir = join(import.meta.dir, '.tmp-views-response')

let server: any = null
let port = 0

/** A page that answers 404 for one name and 200 for the rest. */
const MISSING = `<script server>
const wanted = String(params.name)
const found = wanted === 'real'

if (!found)
  setResponseStatus(404)

setResponseHeader('X-Found', found ? 'yes' : 'no')
</script>
<h1>{{ wanted }}</h1>
`

/** A page that renders who the reader is, from the cookie they sent. */
const WHO = `<script server>
const cookies = __stxServeContext?.cookies ?? {}
const who = cookies.who ?? 'stranger'
</script>
<p>hello {{ who }}</p>
`

/** A page using the shorthand, which is the spelling most pages want. */
const GONE = `<script server>
notFound(410)
</script>
<p>gone</p>
`

// One server for the file: an `afterAll` inside a `describe` stops it when that
// block ends, and the next block then reports a connection refused rather than
// what it was asking about.
beforeAll(async () => {
  await rm(viewsDir, { recursive: true, force: true })
  await mkdir(join(viewsDir, 'thing'), { recursive: true })
  await writeFile(join(viewsDir, 'thing', '[name].stx'), MISSING)
  await writeFile(join(viewsDir, 'who.stx'), WHO)
  await writeFile(join(viewsDir, 'gone.stx'), GONE)

  const router = new Router()
  router.views(viewsDir)
  server = await router.serve({ port: 0, hostname: '127.0.0.1' })
  port = Number((server as any)?.port ?? (server as any)?.server?.port ?? 0)
})

afterAll(async () => {
  try { server?.stop?.(true) }
  catch { /* already down */ }

  await rm(viewsDir, { recursive: true, force: true })
})

describe('what a view decides about its response', () => {
  it('answers with the status the page asked for', async () => {
    const missing = await fetch(`http://127.0.0.1:${port}/thing/nope`)
    expect(missing.status).toBe(404)

    const present = await fetch(`http://127.0.0.1:${port}/thing/real`)
    expect(present.status).toBe(200)
  })

  it('and with the headers it asked for', async () => {
    const answer = await fetch(`http://127.0.0.1:${port}/thing/real`)

    expect(answer.headers.get('x-found')).toBe('yes')
    // Not at the cost of the one the path sets itself.
    expect(String(answer.headers.get('content-type'))).toContain('text/html')
  })

  it('honours the notFound shorthand, including a status of its own', async () => {
    const answer = await fetch(`http://127.0.0.1:${port}/gone`)
    expect(answer.status).toBe(410)
  })

  it('a status outside the range is ignored rather than answered with', async () => {
    // The page below asks for something impossible; the response is still one
    // a client can read. A typo is not worth a 500 from the host reading it.
    await writeFile(join(viewsDir, 'silly.stx'), '<script server>\nsetResponseStatus(9000)\n</script>\n<p>ok</p>\n')

    const router = new Router()
    router.views(viewsDir)
    const other = await router.serve({ port: 0, hostname: '127.0.0.1' })
    const otherPort = Number((other as any)?.port ?? 0)

    const answer = await fetch(`http://127.0.0.1:${otherPort}/silly`)
    expect(answer.status).toBe(200)

    try { other?.stop?.(true) }
    catch { /* already down */ }
  })
})

describe('what a view can see of the request', () => {
  it('reads the cookies the reader sent', async () => {
    const answer = await fetch(`http://127.0.0.1:${port}/who`, {
      headers: { Cookie: 'who=ada; other=ignored' },
    })

    expect(await answer.text()).toContain('hello ada')
  })

  it('and renders a reader with no cookies as one, rather than failing silently', async () => {
    const answer = await fetch(`http://127.0.0.1:${port}/who`)

    // The point is that the page rendered at all. Before the context existed
    // this threw inside the script and produced a page with every binding
    // undefined - which looks like a page that decided nobody was there.
    expect(await answer.text()).toContain('hello stranger')
  })
})
