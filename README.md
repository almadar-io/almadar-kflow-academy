# KFlow Academy

KFlow Knowledge Management Application - Vite + React + TypeScript + Express.

## Structure

```
apps/kflow/
├── packages/
│   ├── client/     # Vite + React frontend
│   └── server/     # Express + TypeScript backend
├── package.json    # Workspace root
└── README.md       # This file
```

## Development

```bash
# Install dependencies
npm install

# Run both client and server in dev mode
npm run dev

# Run only client
npm run dev:client

# Run only server
npm run dev:server

# Build for production
npm run build:all
```

## Ports

- Client: http://localhost:3000
- Server: http://localhost:3001
