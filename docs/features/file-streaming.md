# File Streaming

bun-router provides built-in utilities for efficiently streaming files to clients. This is particularly useful for serving static assets, downloads, or streaming media files like videos and audio.

## Basic File Streaming

The simplest way to stream a file is using the `streamFile` method:

```typescript
import { BunRouter } from 'bun-router'

const router = new BunRouter()

router.get('/download/report', (req) => {
  return router.streamFile('./files/report.pdf', {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="report.pdf"'
    }
  })
})
```

The `streamFile` method automatically:

- Reads the file in chunks to minimize memory usage
- Sets appropriate headers like `Content-Length`
- Handles errors such as file not found

## Streaming with Range Support

For media files like videos and audio, clients often request specific byte ranges of a file. This is essential for features like seeking in video players. The `streamFileWithRanges` method handles these range requests:

```typescript
router.get('/videos/{filename}', (req) => {
  const filename = req.params.filename
  return router.streamFileWithRanges(`./videos/${filename}`, req)
})
```

This method automatically:

- Detects `Range` headers in the request
- Responds with appropriate status codes (206 Partial Content)
- Sets `Content-Range` headers
- Streams only the requested bytes

## Content Type Detection

bun-router can automatically detect the content type based on the file extension:

```typescript
router.get('/assets/{filename}', (req) => {
  const filename = req.params.filename
  return router.streamFile(`./public/assets/${filename}`, {
    detectContentType: true
  })
})
```

For security reasons, it's often better to explicitly set the content type, especially for user-uploaded files.

## Custom Stream Options

You can customize how files are streamed:

```typescript
router.get('/large-file', (req) => {
  return router.streamFile('./files/large-data.bin', {
    // Custom headers
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="data.bin"',
      'Cache-Control': 'public, max-age=86400'
    },

    // Adjust chunk size for streaming (default is 64KB)
    chunkSize: 128 * 1024, // 128KB chunks

    // Set to true to attempt to use high performance system calls like sendfile
    useNativeOptimization: true
  })
})
```

## File Download with Custom Filename

When offering files for download, you can set a custom filename using the Content-Disposition header:

```typescript
router.get('/download/invoice/{id}', async (req) => {
  const invoiceId = req.params.id
  const invoice = await getInvoice(invoiceId)

  // Generate custom filename
  const filename = `invoice-${invoice.number}-${invoice.date}.pdf`

  return router.streamFile(invoice.path, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
})
```

## Conditional GET Support

bun-router supports conditional GET requests with ETag and Last-Modified headers:

```typescript
router.get('/files/{filename}', (req) => {
  const filename = req.params.filename
  const filePath = `./public/files/${filename}`

  return router.streamFile(filePath, {
    // Enable ETag generation based on file content hash
    enableETag: true,

    // Enable Last-Modified headers based on file modification time
    enableLastModified: true,

    // Default Cache-Control (optional)
    headers: {
      'Cache-Control': 'public, max-age=3600'
    }
  })
})
```

With these options enabled, the router will:

1. Check if the request includes `If-None-Match` or `If-Modified-Since` headers
2. Return a 304 Not Modified response if the file hasn't changed
3. Stream the file only if it has been modified

## Streaming From Memory

You can also stream data from memory rather than from a file:

```typescript
router.get('/generated-report', async (req) => {
  // Generate a large report
  const reportData = await generateLargeReport()

  // Stream from a Uint8Array or ArrayBuffer
  return router.streamFromMemory(reportData, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="report.pdf"'
    }
  })
})
```

## Handling File Errors

You can customize how file errors are handled:

```typescript
router.get('/documents/{filename}', (req) => {
  const filename = req.params.filename

  try {
    return router.streamFile(`./documents/${filename}`, {
      headers: {
        'Content-Type': 'application/pdf'
      }
    })
  }
  catch (error) {
    // Handle specific errors
    if (error.code === 'ENOENT') {
      return new Response('File not found', { status: 404 })
    }
    else if (error.code === 'EACCES') {
      return new Response('Permission denied', { status: 403 })
    }
    else {
      console.error('File error:', error)
      return new Response('Error streaming file', { status: 500 })
    }
  }
})
```

## Directory Browsing

You can implement simple directory browsing:

```typescript
router.get('/files(/*)?', async (req) => {
  // Extract the path from the URL
  const path = req.url.replace(/^\/files\//, '').replace(/^\/files$/, '')
  const dirPath = `./public/files/${path}`

  try {
    // Check if this is a directory
    const stat = await Bun.file(dirPath).stat()

    if (stat.isDirectory) {
      // List directory contents
      const files = await Bun.readdir(dirPath)

      const items = await Promise.all(files.map(async (file) => {
        const fileStat = await Bun.file(`${dirPath}/${file}`).stat()
        return {
          name: file,
          isDirectory: fileStat.isDirectory,
          size: fileStat.size,
          mtime: fileStat.mtime
        }
      }))

      // Generate simple HTML listing
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Directory: ${path || '/'}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
              tr:hover { background-color: #f5f5f5; }
            </style>
          </head>
          <body>
            <h1>Directory: ${path || '/'}</h1>
            <table>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Modified</th>
              </tr>
              ${path ? `<tr><td><a href="/files/${path.split('/').slice(0, -1).join('/')}">.. (Parent Directory)</a></td><td></td><td></td></tr>` : ''}
              ${items.map(item => `
                <tr>
                  <td><a href="/files/${path ? `${path}/` : ''}${item.name}">${item.name}${item.isDirectory ? '/' : ''}</a></td>
                  <td>${item.isDirectory ? '-' : formatFileSize(item.size)}</td>
                  <td>${new Date(item.mtime).toLocaleString()}</td>
                </tr>
              `).join('')}
            </table>
          </body>
        </html>
      `

      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      })
    }
    else {
      // It's a file, stream it
      return router.streamFile(dirPath, {
        detectContentType: true
      })
    }
  }
  catch (error) {
    return new Response('Not found', { status: 404 })
  }
})

// Helper function to format file sizes
function formatFileSize(bytes) {
  if (bytes < 1024)
    return `${bytes} B`
  else if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  else if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  else return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
```

## Restricting Access to Files

You can add authentication or validation before streaming files:

```typescript
router.get('/protected-files/{filename}', (req) => {
  // Check for authentication
  const token = req.headers.get('Authorization')?.split(' ')[1]

  if (!token || !validateToken(token)) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Check for file access permissions
  const filename = req.params.filename
  const user = getUserFromToken(token)

  if (!canUserAccessFile(user, filename)) {
    return new Response('Forbidden', { status: 403 })
  }

  // Stream the file if authorized
  return router.streamFile(`./protected/${filename}`)
})
```

## Rate Limiting File Downloads

You can implement rate limiting for file downloads:

```typescript
// Import or create a rate limiter
import { RateLimiter } from './rate-limiter'

// Create a rate limiter (e.g., 5 downloads per minute per IP)
const downloadLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5
})

router.get('/downloads/{filename}', (req) => {
  // Get client IP
  const ip = router.requestIP(req) || 'unknown'

  // Check rate limit
  if (!downloadLimiter.allow(ip)) {
    return new Response('Too many download requests, please try again later', {
      status: 429,
      headers: {
        'Retry-After': '60'
      }
    })
  }

  // Stream the file
  const filename = req.params.filename
  return router.streamFile(`./downloads/${filename}`, {
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
})
```

## Tracking Downloads

You can track file downloads:

```typescript
router.get('/track-downloads/{filename}', async (req) => {
  const filename = req.params.filename

  // Record the download
  await logDownload({
    filename,
    ip: router.requestIP(req),
    userAgent: req.headers.get('User-Agent'),
    timestamp: new Date()
  })

  // Stream the file
  return router.streamFile(`./downloads/${filename}`)
})
```

## Next Steps

Now that you understand file streaming in bun-router, check out these related topics:

- [Route Parameters](/features/route-parameters) - Create dynamic file routes
- [Middleware](/features/middleware) - Add authentication or logging middleware for file access
- [Cookie Handling](/features/cookie-handling) - Use cookies to track user preferences for file downloads
