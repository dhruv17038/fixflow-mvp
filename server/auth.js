import jwt from "jsonwebtoken";

export function requireAppAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  try {
    if (!token) throw new Error("Missing token");
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Please sign in again." });
  }
}

export function requireMcpAuth(req, res, next) {
  const expected = process.env.MCP_TOKEN;
  if (!expected) return res.status(503).json({ error: "MCP_TOKEN is not configured." });
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (token !== expected) return res.status(401).json({ error: "Invalid MCP bearer token." });
  next();
}