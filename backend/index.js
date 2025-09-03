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
import doctorRoutes from "./routes/doctorRoutes.js";
import managerRoutes from "./routes/managerRoutes.js";
import nurseRoutes from "./routes/nurseRoutes.js";
import cleanerRoutes from "./routes/cleanerRoutes.js";
import receptionistRoutes from "./routes/receptionistRoutes.js";
import { errorHandler } from "./utils/errorHandler.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3030;
const mongoUrl = process.env.MONGO_URL;

// MongoDB Connection
(async () => {
  try {
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to the database");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
})();

// Middleware
const allowedOrigins = [process.env.FRONTEND_URL];
app.use(
  cors({
    origin: allowedOrigins,
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

// Routes
app.use("/admin", adminRoutes);
app.use("/patient", patientRoutes);
app.use("/doctor", doctorRoutes);
app.use("/manager", managerRoutes);
app.use("/nurse", nurseRoutes);
app.use("/cleaner", cleanerRoutes);
app.use("/receptionist", receptionistRoutes);
app.use("/user", userRoutes);
app.use("/hospital", hospitalRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start Server
httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Set up Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.FRONTEND_URL],
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
