import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import { Server } from "socket.io";
import { createServer } from "http";
import hospitalRoutes from "./routes/hospitalRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import managerRoutes from "./routes/managerRoutes.js";
import receptionistRoutes from "./routes/receptionistRoutes.js";
import ambulanceRoutes from "./routes/ambulanceRoutes.js";
import icuRoutes from "./routes/icuRoutes.js";
import metaRoutes from "./routes/metaRoutes.js";
import { errorHandler } from "./utils/errorHandler.js";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3030;
const mongoUrl = process.env.MONGO_URL;

// MongoDB Connection
(async () => {
  try {
    await mongoose.connect(mongoUrl);
    console.log("Connected to the database");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
})();

// Middleware
// Allow configuring CORS via env vars. For quick testing set CORS_ALLOW_ALL=true
const corsAllowAll = process.env.CORS_ALLOW_ALL === 'true';
let allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
];
// remove falsy entries
allowedOrigins = allowedOrigins.filter(Boolean);

app.use(
  cors({
    origin: corsAllowAll ? true : allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "./temp/",
  })
);

// Health Check Endpoint
app.get("/health", (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || "development",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  };
  res.status(200).json(healthcheck);
});

// Routes
app.use("/admin", adminRoutes);
app.use("/patient", patientRoutes);
app.use("/manager", managerRoutes);
app.use("/receptionist", receptionistRoutes);
app.use("/ambulance", ambulanceRoutes);
app.use("/user", userRoutes);
app.use("/hospital", hospitalRoutes);
app.use("/icu", icuRoutes);
app.use("/meta", metaRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start Server
httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Set up Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: corsAllowAll ? true : allowedOrigins,
    methods: ["GET", "POST","PUT","DELETE"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Emit data on connection
  socket.emit("Data", "Welcome to the server!");

  // Listen for custom events
  socket.on("hospitalAdded", (newHospital) => {
    console.log("New hospital received:", newHospital);
    io.emit("hospitalAdded", newHospital); // Broadcast to all connected clients
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

export { app, io };
