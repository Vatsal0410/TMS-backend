import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import projectRoutes from "./routes/projects";
import taskRoutes from "./routes/tasks";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI as string;

if (!MONGO_URI) {
  throw new Error("❌ MONGODB_URI is missing in environment variables");
}

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);

app.get("/health", (req, res) => {
  res.json({ message: "Server is running!" });
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("📦 Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

startServer();