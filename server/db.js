import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, default: "", maxlength: 3000 },
  building: { type: String, required: true, trim: true },
  location: { type: String, default: "" },
  category: { type: String, default: "General" },
  priority: { type: String, enum: ["Low", "Medium", "High", "Urgent"], default: "Medium" },
  status: { type: String, enum: ["Open", "In progress", "Resolved"], default: "Open" },
  assignee: { type: String, default: "Unassigned" },
  dueDate: { type: Date, default: null },
  createdBy: { type: String, default: "Claude via MCP" }
}, { timestamps: true });

export const Ticket = mongoose.model("Ticket", ticketSchema);

export async function connectDB(uri) {
  if (!uri) throw new Error("MONGODB_URI is missing. Add your MongoDB Atlas connection string.");
  await mongoose.connect(uri);
  console.log("MongoDB connected");
}