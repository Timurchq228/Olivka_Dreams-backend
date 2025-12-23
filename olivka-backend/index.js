import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// тестовый роут
app.get("/", (req, res) => {
  res.json({ message: "Backend is working 🚀" });
});

// пример API
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

// подключение MongoDB (если нет — просто не будет подключаться)
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.log("⚠️ MONGO_URI not found, skipping DB connection");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB error:", err.message);
  }
};

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  await connectDB();
  console.log(`✅ Server running on port ${PORT}`);
});
