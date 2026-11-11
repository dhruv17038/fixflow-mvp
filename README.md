# FixFlow MVP

FixFlow is a maintenance-ticket workspace operated through Claude via a remote MCP server. Claude does the interpretation and writing; FixFlow stores, edits and serves the operational record. There are no AI APIs or AI keys in this codebase.

## Architecture

- React + Vite dashboard
- Express REST API for dashboard CRUD
- MongoDB Atlas for persistent tickets
- Official MCP TypeScript SDK v1, Streamable HTTP transport
- `POST /mcp` is the remote MCP endpoint
- MCP bearer token is separate from the dashboard password

## 1. Prerequisites

Install Node.js 20+ and create a free MongoDB Atlas database. In Atlas, create a database user, allow your development IP (or temporarily `0.0.0.0/0` for hosted testing), and copy the Node.js connection string.

## 2. Run locally

```bash
npm install
cp .env.example .env
```

Edit `.env`:
- `MONGODB_URI`: your Atlas connection string
- `JWT_SECRET`: long random secret
- `APP_PASSWORD`: choose a dashboard password
- `MCP_TOKEN`: another long random secret

Then run:

```bash
npm run dev
```

Open http://localhost:5173. Sign in using `APP_PASSWORD`.

## 3. Test MCP locally

The MCP endpoint is `http://localhost:3001/mcp`. It requires `Authorization: Bearer YOUR_MCP_TOKEN`.

Use MCP Inspector:

```bash
npx @modelcontextprotocol/inspector
```

Choose Streamable HTTP, enter `http://localhost:3001/mcp`, and add an Authorization header with `Bearer YOUR_MCP_TOKEN`. List tools and call `create_ticket`.

## 4. Deploy

The simplest MVP deployment is one Render Web Service serving both the built frontend and API.

1. Push this repository to GitHub.
2. In Render, create a **Web Service** from the repository.
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add environment variables: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `APP_PASSWORD`, `MCP_TOKEN`, `APP_ORIGIN=https://YOUR-RENDER-SERVICE.onrender.com`, `PUBLIC_APP_URL=https://YOUR-RENDER-SERVICE.onrender.com`.
6. Deploy. Render provides a public URL. Test `/health`, dashboard login, create/edit ticket, and `/mcp`.

Because the frontend and backend share one origin in this deployment, no separate CORS configuration is needed. If you later split them, set `APP_ORIGIN` to the exact frontend origin.

## 5. Connect Claude

In Claude, open **Customize → Connectors → Add custom connector** (the exact labels can vary by plan/UI):
- Name: FixFlow
- URL: `https://YOUR-RENDER-SERVICE.onrender.com/mcp`
- Authentication: choose no sign-in if configuring a no-auth demo only; for this project select bearer/header authentication and add `Authorization: Bearer YOUR_MCP_TOKEN` if the UI offers custom request headers.

After connecting, enable FixFlow in the conversation's tools menu. Try:

> Create a high-priority maintenance ticket for Building A. The air conditioning on the third floor is not working. Assign it to Rahul and set the due date to 2026-11-13.

Then open FixFlow and edit the ticket. Try asking Claude to list open tickets and update the ticket status to In progress.

Claude's current custom-connector instructions: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp

## MCP tools

- `create_ticket`: create a persisted maintenance ticket
- `list_tickets`: list/filter tickets
- `get_ticket`: retrieve one ticket
- `update_ticket`: edit a ticket

## Demo security notes

This is a single-workspace assignment MVP, not production multi-tenant SaaS. Keep the demo password and MCP token private; do not use real building/security-sensitive information. The dashboard uses a shared workspace password. Before commercial launch, add individual users, per-workspace tenant isolation, OAuth-based MCP authorization, audit logs, rate limiting and role-based permissions.

## Troubleshooting

- `MONGODB_URI is missing`: set it in `.env` / Render environment.
- `Invalid MCP bearer token`: check the exact MCP token header.
- Claude cannot reach the endpoint: confirm Render service is live and `/health` responds publicly. Claude's remote connector reaches the service from Anthropic's cloud, so localhost URLs will not work.
- MongoDB connection timeout: check Atlas Network Access and database user credentials.
