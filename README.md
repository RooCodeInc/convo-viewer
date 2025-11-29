# Convo Viewer

View Roo Code conversation history from your local tasks.

## Features

- Toggle between **Nightly** and **Production** task sources
- Tasks sorted by most recent
- Full conversation view with all message details:
  - Text, reasoning, tool_use, tool_result blocks
  - Color-coded by block type
  - Expandable/collapsible content

## Requirements

- macOS
- Node.js 18+
- pnpm

## Run

```bash
pnpm i
pnpm dev
```

Open http://localhost:41840

## Port Configuration

The app uses uncommon default ports to avoid conflicts:
- **Backend server**: 41839
- **Frontend dev server**: 41840

If either port is in use, the app will automatically find the next available port and continue working. The backend writes its port to a `.server-port` file that the frontend reads to configure the proxy correctly.
