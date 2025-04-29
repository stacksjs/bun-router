# WebSocket Design Patterns

This guide explores effective design patterns for WebSocket applications in bun-router.

## Pub/Sub Pattern

The publish-subscribe pattern is ideal for broadcasting messages to multiple clients:

```typescript
import { Router } from 'bun-router'

const router = new Router()

// Store for active subscriptions
const subscriptions = new Map()

router.ws('/pubsub', {
  open(ws) {
    // Initialize client's subscriptions
    ws.data = { channels: new Set() }
    console.log('Client connected')
  },
  message(ws, message) {
    try {
      const data = JSON.parse(message)

      switch (data.type) {
        case 'subscribe':
          handleSubscribe(ws, data.channel)
          break
        case 'unsubscribe':
          handleUnsubscribe(ws, data.channel)
          break
        case 'publish':
          handlePublish(data.channel, data.message)
          break
      }
    }
    catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }))
    }
  },
  close(ws) {
    // Clean up subscriptions when client disconnects
    if (ws.data?.channels) {
      for (const channel of ws.data.channels) {
        const channelClients = subscriptions.get(channel) || new Set()
        channelClients.delete(ws)
      }
    }
    console.log('Client disconnected')
  }
})

function handleSubscribe(ws, channel) {
  // Add client to channel subscribers
  if (!subscriptions.has(channel)) {
    subscriptions.set(channel, new Set())
  }

  const channelClients = subscriptions.get(channel)
  channelClients.add(ws)

  // Track subscription in client data
  ws.data.channels.add(channel)

  // Confirm subscription
  ws.send(JSON.stringify({
    type: 'subscribed',
    channel
  }))

  console.log(`Client subscribed to ${channel}`)
}

function handleUnsubscribe(ws, channel) {
  // Remove client from channel subscribers
  if (subscriptions.has(channel)) {
    const channelClients = subscriptions.get(channel)
    channelClients.delete(ws)

    // Clean up empty channels
    if (channelClients.size === 0) {
      subscriptions.delete(channel)
    }
  }

  // Remove from client's subscriptions
  if (ws.data?.channels) {
    ws.data.channels.delete(channel)
  }

  // Confirm unsubscription
  ws.send(JSON.stringify({
    type: 'unsubscribed',
    channel
  }))

  console.log(`Client unsubscribed from ${channel}`)
}

function handlePublish(channel, message) {
  if (!subscriptions.has(channel)) {
    return
  }

  const channelClients = subscriptions.get(channel)
  const payload = JSON.stringify({
    type: 'message',
    channel,
    message
  })

  // Broadcast to all subscribers
  for (const client of channelClients) {
    client.send(payload)
  }

  console.log(`Message published to ${channel} (${channelClients.size} recipients)`)
}
```

## Room-Based Collaboration

For applications requiring collaborative features:

```typescript
import { Router } from 'bun-router'

const router = new Router()

// Store rooms and their members
const rooms = new Map()

router.ws('/rooms/:roomId', {
  open(ws, req) {
    const { roomId } = req.params
    const username = req.query.username || `user-${Math.floor(Math.random() * 10000)}`

    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map())
    }

    const room = rooms.get(roomId)

    // Store client info
    ws.data = { roomId, username }
    room.set(ws, { username })

    // Notify everyone in the room
    broadcastToRoom(roomId, {
      type: 'system',
      message: `${username} joined the room`
    })

    // Send room state to new user
    ws.send(JSON.stringify({
      type: 'room-info',
      users: Array.from(room.values()).map(u => u.username),
      roomId
    }))

    console.log(`${username} joined room ${roomId}`)
  },
  message(ws, message) {
    if (!ws.data?.roomId)
      return

    try {
      const data = JSON.parse(message)
      const { roomId, username } = ws.data

      // Add sender info to the message
      const enrichedMessage = {
        ...data,
        sender: username,
        timestamp: Date.now()
      }

      // Broadcast to room
      broadcastToRoom(roomId, enrichedMessage, ws)
    }
    catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }))
    }
  },
  close(ws) {
    if (!ws.data?.roomId)
      return

    const { roomId, username } = ws.data

    if (rooms.has(roomId)) {
      const room = rooms.get(roomId)

      // Remove user from room
      room.delete(ws)

      // Delete room if empty
      if (room.size === 0) {
        rooms.delete(roomId)
        console.log(`Room ${roomId} deleted (empty)`)
      }
      else {
        // Notify remaining users
        broadcastToRoom(roomId, {
          type: 'system',
          message: `${username} left the room`
        })
      }
    }

    console.log(`${username} left room ${roomId}`)
  }
})

function broadcastToRoom(roomId, message, excludeClient = null) {
  if (!rooms.has(roomId))
    return

  const room = rooms.get(roomId)
  const payload = JSON.stringify(message)

  for (const [client] of room) {
    if (client !== excludeClient) {
      client.send(payload)
    }
  }
}
```

## Request-Response Pattern

Implement a request-response pattern for client-server exchanges:

```typescript
import { Router } from 'bun-router'

const router = new Router()

router.ws('/api', {
  open(ws) {
    ws.data = { pendingRequests: new Map() }
    ws.send(JSON.stringify({ type: 'connected' }))
  },
  message(ws, message) {
    try {
      const request = JSON.parse(message)

      // Check if this is a valid request with requestId
      if (!request.requestId) {
        return ws.send(JSON.stringify({
          type: 'error',
          message: 'Missing requestId'
        }))
      }

      // Handle different operation types
      switch (request.operation) {
        case 'getData':
          handleGetData(ws, request)
          break
        case 'updateData':
          handleUpdateData(ws, request)
          break
        default:
          ws.send(JSON.stringify({
            requestId: request.requestId,
            type: 'error',
            message: `Unknown operation: ${request.operation}`
          }))
      }
    }
    catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid request format'
      }))
    }
  }
})

async function handleGetData(ws, request) {
  try {
    // Simulate data retrieval
    const data = await fetchDataFromDB(request.params)

    // Send response with same requestId
    ws.send(JSON.stringify({
      requestId: request.requestId,
      type: 'response',
      data
    }))
  }
  catch (error) {
    ws.send(JSON.stringify({
      requestId: request.requestId,
      type: 'error',
      message: error.message
    }))
  }
}

async function handleUpdateData(ws, request) {
  try {
    // Simulate data update
    const result = await updateDataInDB(request.params)

    // Send response
    ws.send(JSON.stringify({
      requestId: request.requestId,
      type: 'response',
      success: true,
      result
    }))
  }
  catch (error) {
    ws.send(JSON.stringify({
      requestId: request.requestId,
      type: 'error',
      message: error.message
    }))
  }
}

// Simulation functions
async function fetchDataFromDB(params) {
  // In a real app, this would query a database
  return { id: params.id, name: 'Example', value: Math.random() }
}

async function updateDataInDB(params) {
  // In a real app, this would update a database
  return { updated: true, timestamp: Date.now() }
}
```

## Event Sourcing Pattern

Implement event sourcing for maintaining state across clients:

```typescript
import { Router } from 'bun-router'

const router = new Router()

// Event store
const events = []
// Current state
const currentState = { count: 0, lastUpdated: null }

router.ws('/events', {
  open(ws) {
    // Send current state and event history to new client
    ws.send(JSON.stringify({
      type: 'init',
      state: currentState,
      events
    }))
  },
  message(ws, message) {
    try {
      const eventData = JSON.parse(message)

      // Validate event
      if (!eventData.type) {
        return ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid event: missing type'
        }))
      }

      // Process the event
      const event = {
        ...eventData,
        timestamp: Date.now(),
        id: events.length + 1
      }

      // Add to event store
      events.push(event)

      // Update state based on event type
      updateState(event)

      // Broadcast to all clients
      broadcast({
        type: 'event',
        event
      })

      // Also send current state
      broadcast({
        type: 'state',
        state: currentState
      })
    }
    catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }))
    }
  }
})

function updateState(event) {
  // Update state based on event type
  switch (event.type) {
    case 'increment':
      currentState.count += event.value || 1
      break
    case 'decrement':
      currentState.count -= event.value || 1
      break
    case 'reset':
      currentState.count = 0
      break
  }

  currentState.lastUpdated = event.timestamp
}

function broadcast(message) {
  const payload = JSON.stringify(message)

  // Send to all connected clients
  router.webSocketClients.forEach((client) => {
    if (client.socket.url.includes('/events')) {
      client.send(payload)
    }
  })
}
```

## Next Steps

Now that you've explored WebSocket design patterns in bun-router, check out these related topics:

- [Performance Optimization](/advanced/performance-optimization) - Optimize your WebSocket applications
- [Error Handling](/advanced/error-handling) - Handle errors in WebSocket connections
- [Custom Middleware](/advanced/custom-middleware) - Create middleware for WebSocket routes
