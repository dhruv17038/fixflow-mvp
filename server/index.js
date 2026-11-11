import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { connectDB, Ticket } from "./db.js";
import { requireAppAuth, requireMcpAuth } from "./auth.js";
import { handleMcp } from "./mcp.js";

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(cors({ origin: process.env.APP_ORIGIN?.split(",") || true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "FixFlow API", mcp: "/mcp" }));

app.post("/api/login", (req, res) => {
  const { password } = req.body || {};
  if (!process.env.JWT_SECRET || !process.env.APP_PASSWORD) return res.status(503).json({ error: "Login is not configured." });
  if (password !== process.env.APP_PASSWORD) return res.status(401).json({ error: "Incorrect access password." });
  const token = jwt.sign({ role: "workspace-admin", workspace: "demo" }, process.env.JWT_SECRET, { expiresIn: "12h" });
  res.json({ token });
});

app.get("/api/tickets", requireAppAuth, async (req, res) => {
  const tickets = await Ticket.find().sort({ createdAt: -1 }).limit(100).lean();
  res.json(tickets);
});

app.post("/api/tickets", requireAppAuth, async (req, res) => {
  try {
    const ticket = await Ticket.create({ ...req.body, createdBy: "FixFlow dashboard" });
    res.status(201).json(ticket);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.patch("/api/tickets/:id", requireAppAuth, async (req, res) => {
  try {
    const allowed = ["title", "description", "building", "location", "category", "priority", "status", "assignee", "dueDate"];
    const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
    if (!ticket) return res.status(404).json({ error: "Ticket not found." });
    res.json(ticket);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete("/api/tickets/:id", requireAppAuth, async (req, res) => {
  const ticket = await Ticket.findByIdAndDelete(req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });
  res.json({ success: true });
});

// MCP uses its own bearer token; do not put express.json() in front of this route twice.
app.post("/mcp", requireMcpAuth, handleMcp);
app.get("/mcp", (_req, res) => res.status(405).json({ error: "Use MCP Streamable HTTP POST." }));
app.delete("/mcp", (_req, res) => res.status(405).json({ error: "Stateless MCP sessions do not support DELETE." }));

if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(__dirname, "../dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

await connectDB(process.env.MONGODB_URI);
app.listen(PORT, "0.0.0.0", () => console.log(`FixFlow API listening on ${PORT}`));