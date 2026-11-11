import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { Ticket } from "./db.js";

const asText = (value) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value });

function makeMcpServer() {
  const server = new McpServer({ name: "fixflow-maintenance", version: "1.0.0" });

  server.registerTool("create_ticket", {
    title: "Create maintenance ticket",
    description: "Create a real maintenance ticket in FixFlow. Use this when the user reports a new maintenance issue. Provide a concise title, building, location, priority, assignee and optional due date.",
    inputSchema: {
      title: z.string().min(3).max(140),
      description: z.string().max(3000).optional(),
      building: z.string().min(1),
      location: z.string().optional(),
      category: z.string().optional(),
      priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
      assignee: z.string().optional(),
      dueDate: z.string().optional()
    }
  }, async (input) => {
    const ticket = await Ticket.create({
      ...input,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      createdBy: "Claude via MCP"
    });
    return asText({ success: true, message: "Maintenance ticket created in FixFlow.", ticket });
  });

  server.registerTool("list_tickets", {
    title: "List maintenance tickets",
    description: "Find maintenance tickets in FixFlow. Optionally filter by status, building or priority.",
    inputSchema: {
      status: z.enum(["Open", "In progress", "Resolved"]).optional(),
      building: z.string().optional(),
      priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
      limit: z.number().int().min(1).max(50).optional()
    }
  }, async ({ status, building, priority, limit = 20 }) => {
    const query = {};
    if (status) query.status = status;
    if (building) query.building = new RegExp(building.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (priority) query.priority = priority;
    const tickets = await Ticket.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    return asText({ count: tickets.length, tickets });
  });

  server.registerTool("update_ticket", {
    title: "Update maintenance ticket",
    description: "Edit an existing FixFlow ticket. Use the ticket ID returned by create_ticket or list_tickets. Only supplied fields are changed.",
    inputSchema: {
      ticketId: z.string().min(1),
      title: z.string().min(3).max(140).optional(),
      description: z.string().max(3000).optional(),
      building: z.string().optional(),
      location: z.string().optional(),
      category: z.string().optional(),
      priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
      status: z.enum(["Open", "In progress", "Resolved"]).optional(),
      assignee: z.string().optional(),
      dueDate: z.string().optional()
    }
  }, async ({ ticketId, dueDate, ...changes }) => {
    if (dueDate !== undefined) changes.dueDate = dueDate ? new Date(dueDate) : null;
    const ticket = await Ticket.findByIdAndUpdate(ticketId, changes, { new: true, runValidators: true });
    if (!ticket) return { content: [{ type: "text", text: `Ticket ${ticketId} was not found.` }], isError: true };
    return asText({ success: true, message: "Ticket updated in FixFlow.", ticket });
  });

  server.registerTool("get_ticket", {
    title: "Get maintenance ticket",
    description: "Retrieve one FixFlow ticket by its MongoDB ticket ID.",
    inputSchema: { ticketId: z.string().min(1) }
  }, async ({ ticketId }) => {
    const ticket = await Ticket.findById(ticketId).lean();
    if (!ticket) return { content: [{ type: "text", text: `Ticket ${ticketId} was not found.` }], isError: true };
    return asText(ticket);
  });

  return server;
}

export async function handleMcp(req, res) {
  const server = makeMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => { transport.close(); server.close(); });
  } catch (error) {
    console.error("MCP request failed:", error);
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "MCP internal error" }, id: null });
    await transport.close();
    await server.close();
  }
}