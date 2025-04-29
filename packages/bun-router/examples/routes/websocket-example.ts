import { Router } from '../../src'
import type { ServerWebSocket } from 'bun'

// Define client data type
interface ClientData {
  username: string
  room: string
  joinedAt: number
  messageQueue?: string[] // Queue for messages during backpressure
}

// Create a router
const router: Router = new Router()

// Simple HTML page with WebSocket client
router.get('/', () => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>WebSocket Chat</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 1rem; }
    #messages { height: 300px; border: 1px solid #ccc; overflow-y: scroll; margin-bottom: 1rem; padding: 0.5rem; }
    input[type="text"] { width: 70%; padding: 0.5rem; }
    button { padding: 0.5rem 1rem; }
    .rooms { margin-bottom: 1rem; }
    .room-btn { margin-right: 0.5rem; }
    .active { background: #4a90e2; color: white; }
  </style>
</head>
<body>
  <h1>WebSocket Chat</h1>

  <div class="rooms">
    <strong>Rooms:</strong>
    <button class="room-btn active" data-room="general">General</button>
    <button class="room-btn" data-room="random">Random</button>
    <button class="room-btn" data-room="tech">Tech</button>
  </div>

  <div id="messages"></div>
  <div>
    <input type="text" id="message" placeholder="Type a message...">
    <button id="send">Send</button>
  </div>

  <script>
    const ws = new WebSocket("ws://" + window.location.host + "/chat");
    const messagesEl = document.getElementById("messages");
    const messageInput = document.getElementById("message");
    const sendButton = document.getElementById("send");
    const roomButtons = document.querySelectorAll('.room-btn');

    let currentRoom = "general";

    // Handle connection open
    ws.onopen = () => {
      addMessage("Connected to server", "system");
    };

    // Handle received messages
    ws.onmessage = (event) => {
      try {
        // Try to parse as JSON
        const data = JSON.parse(event.data);
        if (data.type === 'system') {
          addMessage(data.message, "system");
        } else if (data.type === 'chat') {
          addMessage(\`\${data.username}: \${data.message}\`, "user");
        } else if (data.type === 'room-change') {
          addMessage(\`Room changed to \${data.room}\`, "system");
        }
      } catch (e) {
        // Fallback for plain text messages
        addMessage(event.data, "system");
      }
    };

    // Handle connection close
    ws.onclose = () => {
      addMessage("Disconnected from server", "system");
    };

    // Handle errors
    ws.onerror = (error) => {
      addMessage("Error: " + error, "error");
    };

    // Send message on button click
    sendButton.addEventListener("click", sendMessage);
    messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });

    // Room selection
    roomButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const newRoom = btn.dataset.room;

        // Update UI
        roomButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Send room change command
        ws.send(JSON.stringify({
          command: 'join-room',
          room: newRoom
        }));

        currentRoom = newRoom;
      });
    });

    function sendMessage() {
      if (messageInput.value) {
        // Send as JSON with command and room info
        ws.send(JSON.stringify({
          command: 'message',
          room: currentRoom,
          text: messageInput.value
        }));

        messageInput.value = "";
      }
    }

    function addMessage(message, type) {
      const messageEl = document.createElement("div");
      messageEl.textContent = message;

      // Add style based on message type
      if (type === "system") {
        messageEl.style.color = "#666";
        messageEl.style.fontStyle = "italic";
      } else if (type === "error") {
        messageEl.style.color = "red";
      }

      messagesEl.appendChild(messageEl);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  </script>
</body>
</html>
  `

  return new Response(html, {
    headers: { "Content-Type": "text/html" }
  })
})

// Configure WebSocket handling with enhanced features
router.websocket({
  // Handle incoming messages with JSON parsing
  message(ws, message) {
    try {
      // Try to parse as JSON if it's a string
      if (typeof message === 'string') {
        const data = JSON.parse(message);

        // Handle different commands
        switch (data.command) {
          case 'message':
            handleChatMessage(ws, data);
            break;
          case 'join-room':
            handleRoomChange(ws, data);
            break;
          default:
            // Echo back unknown commands
            sendJson(ws, {
              type: 'system',
              message: `Unknown command: ${data.command}`
            });
        }
      } else {
        // Handle binary data if needed
        console.log("Received binary data of length: ", message instanceof ArrayBuffer ?
          message.byteLength : message.length);

        // Echo back as text
        sendJson(ws, {
          type: 'system',
          message: "Received binary data"
        });
      }
    } catch (error) {
      // Fallback for non-JSON messages
      console.log("Failed to parse message:", message);

      // Echo back as plain text
      const textMessage = typeof message === 'string' ? message : "Non-text message received";
      ws.send(`You said: ${textMessage}`);
    }
  },

  // Handle new connections
  open(ws) {
    console.log("New connection opened from:", ws.remoteAddress);

    // Set default data for client
    ws.data = {
      username: "User_" + Math.floor(Math.random() * 1000),
      room: "general",
      joinedAt: Date.now()
    };

    // Subscribe to general room
    ws.subscribe("general");

    // Send welcome message as JSON
    sendJson(ws, {
      type: 'system',
      message: `Welcome to the chat, ${ws.data.username}! You are in the 'general' room.`
    });

    // Announce new user to the room
    router.publish("general", JSON.stringify({
      type: 'system',
      message: `${ws.data.username} has joined the chat`
    }));

    // Demo: update user count
    broadcastUserCount();
  },

  // Handle disconnections
  close(ws, code, reason) {
    console.log(`Connection closed: Code ${code}, Reason: ${reason || 'none'}`);

    // Announce user departure if they were in a room
    if (ws.data?.room && ws.data?.username) {
      router.publish(ws.data.room, JSON.stringify({
        type: 'system',
        message: `${ws.data.username} has left the chat`
      }));
    }

    // Demo: update user count
    broadcastUserCount();
  },

  // Handle errors
  error(ws, error) {
    console.error("WebSocket error:", error);

    // Try to send error notification to client
    try {
      sendJson(ws, {
        type: 'error',
        message: "An error occurred on the server"
      });
    } catch (e) {
      console.error("Failed to send error message:", e);
    }
  },

  // Handle backpressure
  drain(ws: ServerWebSocket<ClientData>) {
    console.log("WebSocket backpressure relieved for client:", ws.data?.username);

    // Resume sending messages if we were throttling
    if (ws.data?.messageQueue && ws.data.messageQueue.length > 0) {
      console.log(`Sending ${ws.data.messageQueue.length} queued messages`);

      // Process the queue without using cork
      let sentCount = 0;

      while (ws.data.messageQueue.length > 0) {
        const msg = ws.data.messageQueue.shift();
        if (msg) {
          const result = ws.send(msg);

          // If we hit backpressure again, stop and wait for next drain
          if (result === -1) {
            console.log("Still experiencing backpressure, waiting for next drain");
            break;
          }

          sentCount++;
        }
      }

      console.log(`Successfully sent ${sentCount} queued messages`);
    }
  },

  // Enable compression
  perMessageDeflate: {
    compress: "16KB",
    decompress: true
  },

  // Configure timeouts and limits
  maxPayloadLength: 64 * 1024, // 64KB max message size
  idleTimeout: 300, // 5 minutes
  backpressureLimit: 1024 * 1024, // 1MB

  // Allow self to receive published messages
  publishToSelf: false
});

// Helper to send JSON messages
function sendJson(ws: ServerWebSocket<ClientData>, data: any, compress = true) {
  const message = JSON.stringify(data);
  const result = ws.send(message, compress);

  // Demo: handle backpressure
  if (result === -1) {
    console.log("Backpressure detected, queueing message");

    // Initialize message queue if it doesn't exist
    if (!ws.data.messageQueue) {
      ws.data.messageQueue = [];
    }

    // Queue message to send later when drain event occurs
    if (ws.data.messageQueue.length < 100) { // Limit queue size
      ws.data.messageQueue.push(message);
    }
  } else if (result === 0) {
    console.log("Failed to send message, connection may be closed");
  } else {
    // Message sent successfully, result is bytes sent
    console.log(`Sent ${result} bytes to ${ws.data.username}`);
  }
}

// Handle chat message
function handleChatMessage(ws: ServerWebSocket<ClientData>, data: any) {
  if (!data.text || typeof data.text !== 'string') {
    sendJson(ws, {
      type: 'error',
      message: "Invalid message format"
    });
    return;
  }

  const room = data.room || ws.data.room;

  // Ensure user is in the room they're trying to message
  if (!ws.isSubscribed(room)) {
    sendJson(ws, {
      type: 'error',
      message: `You are not in the '${room}' room`
    });
    return;
  }

  // Send acknowledgment to sender
  sendJson(ws, {
    type: 'system',
    message: `Message sent to ${room}`
  });

  // Broadcast message to room
  router.publish(room, JSON.stringify({
    type: 'chat',
    username: ws.data.username,
    message: data.text,
    timestamp: Date.now()
  }));

  // Log message
  console.log(`[${room}] ${ws.data.username}: ${data.text}`);
}

// Handle room change
function handleRoomChange(ws: ServerWebSocket<ClientData>, data: any) {
  if (!data.room || typeof data.room !== 'string') {
    sendJson(ws, {
      type: 'error',
      message: "Invalid room format"
    });
    return;
  }

  const validRooms = ['general', 'random', 'tech'];
  const newRoom = data.room;

  if (!validRooms.includes(newRoom)) {
    sendJson(ws, {
      type: 'error',
      message: `Invalid room: ${newRoom}`
    });
    return;
  }

  const oldRoom = ws.data.room;

  // Unsubscribe from old room
  if (ws.isSubscribed(oldRoom)) {
    // Announce departure
    router.publish(oldRoom, JSON.stringify({
      type: 'system',
      message: `${ws.data.username} has left the room`
    }));

    ws.unsubscribe(oldRoom);
  }

  // Subscribe to new room
  ws.subscribe(newRoom);
  ws.data.room = newRoom;

  // Send confirmation to user
  sendJson(ws, {
    type: 'room-change',
    room: newRoom
  });

  // Announce arrival to new room
  router.publish(newRoom, JSON.stringify({
    type: 'system',
    message: `${ws.data.username} has joined the room`
  }));

  console.log(`${ws.data.username} moved from ${oldRoom} to ${newRoom}`);
}

// Broadcast user count to all connected clients
function broadcastUserCount() {
  // In a real app, you'd track connected users more efficiently
  setTimeout(() => {
    ['general', 'random', 'tech'].forEach(room => {
      router.publish(room, JSON.stringify({
        type: 'system',
        message: `Current users in ${room}: ${router.subscriberCount(room)}`
      }));
    });
  }, 100); // Small delay to ensure counts are accurate
}

// Start the server
async function startServer() {
  console.log("Starting WebSocket server...");

  const server = await router.serve({
    port: 3002,
    development: true
  });

  console.log(`WebSocket server running at ${server.url}`);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log("Shutting down server...");
    server.stop();
    process.exit();
  });
}

startServer().catch(console.error);

export default router
