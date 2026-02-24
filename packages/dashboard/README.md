# @stacksjs/bun-router-dashboard

A Vue-powered dashboard for inspecting and debugging your bun-router HTTP traffic.

## Installation

This is a private package used internally within the bun-router monorepo. It is not published to npm.

## Usage

```bash
# Development
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

The dashboard provides a web interface for inspecting router traffic, accessible via the browser after starting the dev server.

## Features

- **Dashboard Overview** - Real-time summary of routing activity
- **Request Inspector** - Inspect incoming requests with full detail
- **Collections** - Organize and save request collections
- **Request History** - Browse past requests with filtering
- **Live Capture** - Record requests in real time
- **WebSocket Monitor** - Inspect WebSocket connections and messages
- **Headers Analyzer** - Examine request and response headers
- **Performance Metrics** - Visualize route performance with Chart.js and D3
- **Response Tester** - Send test requests and inspect responses
- **Environment Selector** - Switch between environments

## License

MIT
