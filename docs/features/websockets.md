# WebSockets

bun-router provides first-class support for WebSockets, leveraging Bun's high-performance WebSocket implementation. This page covers how to work with WebSockets in your bun-router applications.

## Basic WebSocket Setup

To enable WebSocket support, use the `websocket` method on your router:

```typescript
import type { ServerWebSocket } from 'bun'
import { Router } from 'bun-router'

// Define the type for your WebSocket client data
interface ClientData {
  userId: string
  room: string
}

const router = new Router<ClientData>()

// Set up HTTP routes
router.get('/', () => new Response('WebSocket Server'))

// Configure WebSocket handling
router.websocket({
  // Called when a client connects
  open(ws) {
    console.log('Client connected:', ws.remoteAddress)

    // Set custom data on the WebSocket
    ws.data = { userId: generateUserId(), room: 'lobby' }

    // Subscribe to a topic (for pub/sub)
    ws.subscribe('lobby')

    // Send a welcome message
    ws.send('Welcome to the server!')
  },

  // Called when a message is received
  message(ws, message) {
    const content = typeof message === 'string'
      ? message
      : 'Binary data received'

    console.log(`Message from ${ws.data.userId}: ${content}`)

    // Echo the message back
    ws.send(`Echo: ${content}`)
  },

  // Called when a client disconnects
  close(ws, code, reason) {
    console.log(`Client ${ws.data.userId} disconnected: ${reason} (${code})`)
    ws.unsubscribe(ws.data.room)
  },

  // Called when a socket error occurs
  error(ws, error) {
    console.error(`Error for client ${ws.data.userId}:`, error)
  },

  // Called when backpressure is relieved
  drain(ws) {
    console.log(`Backpressure relieved for ${ws.data.userId}`)
  }
})

// Start the server
router.serve({ port: 3000 })
```

## WebSocket Configuration Options

You can customize the WebSocket behavior with additional options:

```typescript
router.websocket({
  // Event handlers
  open: openHandler,
  message: messageHandler,
  close: closeHandler,
  error: errorHandler,
  drain: drainHandler,

  // Maximum message size (default: 16MB)
  maxPayloadLength: 16 * 1024 * 1024,

  // Connection timeout in seconds (default: 120)
  idleTimeout: 120,

  // Backpressure handling
  backpressureLimit: 1024 * 1024, // 1MB
  closeOnBackpressureLimit: false,

  // Compression settings
  perMessageDeflate: {
    compress: '16KB', // Use 16KB compression level
    decompress: true
  },

  // Keep-alive settings
  sendPings: true,

  // Control whether published messages are sent to the publisher
  publishToSelf: false
})
```

## Client Data

You can associate custom data with each WebSocket connection by setting `ws.data`:

```typescript
router.websocket<UserSession>({
  open(ws) {
    ws.data = {
      userId: 'user_123',
      username: 'john',
      authenticated: true,
      joinedAt: Date.now()
    }
  },

  message(ws, message) {
    // Access the data in any handler
    console.log(`Message from ${ws.data.username}`)
  }
})
```

## Pub/Sub Messaging

bun-router includes a pub/sub system for WebSockets, allowing you to broadcast messages to groups of clients:

```typescript
router.websocket({
  open(ws) {
    // Subscribe to channels
    ws.subscribe('announcements')
    ws.subscribe(`user:${ws.data.userId}`)
  },

  message(ws, message) {
    if (typeof message !== 'string')
      return

    // Parse commands
    if (message.startsWith('/join ')) {
      const room = message.slice(6).trim()

      // Leave old room
      ws.unsubscribe(ws.data.room)

      // Join new room
      ws.data.room = room
      ws.subscribe(room)
      ws.send(`Joined room: ${room}`)

      // Announce to the room
      router.publish(room, `${ws.data.username} joined the room`)
    }
    else if (message.startsWith('/whisper ')) {
      // Private message
      const parts = message.slice(9).split(' ')
      const targetUser = parts[0]
      const content = parts.slice(1).join(' ')

      router.publish(`user:${targetUser}`, `[PM from ${ws.data.username}]: ${content}`)
    }
    else {
      // Regular room message
      router.publish(ws.data.room, `${ws.data.username}: ${message}`, true) // Enable compression
    }
  }
})

// You can also publish from outside the WebSocket handlers
function broadcastAnnouncement(message) {
  router.publish('announcements', message)
}
```

## Checking Subscriber Count

You can check how many clients are subscribed to a topic:

```typescript
router.get('/room-stats', () => {
  const lobbyCount = router.subscriberCount('lobby')
  const gamingCount = router.subscriberCount('gaming')

  return Response.json({
    lobby: lobbyCount,
    gaming: gamingCount
  })
})
```

## Custom HTTP to WebSocket Upgrade

You can manually upgrade an HTTP request to a WebSocket connection:

```typescript
router.get('/custom-ws', (req) => {
  // Check for authentication headers
  const token = req.headers.get('Authorization')?.split(' ')[1]

  if (!token || !validateToken(token)) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Get user from token
  const user = getUserFromToken(token)

  // Upgrade the connection
  const success = router.upgrade(req, {
    // Custom headers for the 101 Switching Protocols response
    headers: { 'X-User-ID': user.id },

    // Attach user data to the WebSocket
    data: {
      userId: user.id,
      username: user.username,
      role: user.role,
      room: 'lobby'
    }
  })

  if (!success) {
    return new Response('Failed to upgrade connection', { status: 400 })
  }

  // If upgrade successful, this response is ignored
  return new Response('Upgraded to WebSocket')
})
```

## Handling Binary Data

WebSockets can send and receive binary data:

```typescript
router.websocket({
  message(ws, message) {
    if (typeof message === 'string') {
      // Handle text message
      console.log('Text message:', message)
    }
    else {
      // Handle binary message (Uint8Array)
      console.log('Binary message, size:', message.length)

      // You can send binary data back
      const response = new Uint8Array([1, 2, 3, 4])
      ws.send(response)
    }
  }
})
```

## Handling Backpressure

When sending large messages, you may encounter backpressure. The `send` method returns a value indicating whether the message was sent, queued, or failed:

```typescript
router.websocket({
  message(ws, message) {
    // Generate a large response
    const largeData = generateLargeResponse()

    // Try to send it
    const result = ws.send(largeData)

    if (result === -1) {
      // Message was queued due to backpressure
      console.log('Message queued due to backpressure')

      // Store state to resume in drain handler
      ws.data.pendingMessages = [...ws.data.pendingMessages || [], getMoreData()]
    }
    else if (result === 0) {
      console.log('Failed to send, connection may be closed')
    }
    else {
      console.log(`Sent ${result} bytes successfully`)
    }
  },

  drain(ws) {
    // Socket is ready to receive more data
    if (ws.data.pendingMessages?.length) {
      const next = ws.data.pendingMessages.shift()
      const result = ws.send(next)

      if (result !== -1) {
        console.log('Sent pending message after drain')
      }
    }
  }
})
```

## Client-Side WebSocket Example

Here's an example of how to connect to your WebSocket server from a browser:

```javascript
// Connect to the WebSocket server
const ws = new WebSocket('ws://localhost:3000')

// Connection opened
ws.addEventListener('open', (event) => {
  console.log('Connected to server')
  ws.send('Hello Server!')
})

// Listen for messages
ws.addEventListener('message', (event) => {
  console.log('Message from server:', event.data)
})

// Connection closed
ws.addEventListener('close', (event) => {
  console.log('Disconnected from server:', event.code, event.reason)
})

// Error handler
ws.addEventListener('error', (event) => {
  console.error('WebSocket error:', event)
})

// Send a message when a button is clicked
document.getElementById('send-button').addEventListener('click', () => {
  const message = document.getElementById('message-input').value
  ws.send(message)
})

// Join a room
function joinRoom(roomName) {
  ws.send(`/join ${roomName}`)
}

// Send private message
function sendPrivate(username, message) {
  ws.send(`/whisper ${username} ${message}`)
}
```

## Next Steps

Now that you understand WebSockets in bun-router, you might want to explore these related topics:

- [WebSocket Patterns](/advanced/websocket-patterns) - Common patterns for WebSocket applications
- [Custom Middleware](/advanced/custom-middleware) - Create middleware for WebSocket authentication
- [Performance Optimization](/advanced/performance-optimization) - Tips for high-performance WebSockets
