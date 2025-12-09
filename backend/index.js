import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
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
import { sanitizeRequest } from "./utils/sanitize.js";
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

// Security Middleware - Must be applied BEFORE routes
// 1. Helmet - Set security HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// 2. Rate limiting - Prevent DOS attacks
const isDev = process.env.NODE_ENV !== 'production';
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 10000 : 1000, // Much higher limit
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 100 : 10, // Higher limit in dev, 10 in production
  message: "Too many login attempts, please try again after 15 minutes.",
  skipSuccessfulRequests: true,
});

// Apply rate limiters
app.use("/user/login", authLimiter);
app.use("/user/register", authLimiter);
app.use("/admin/login", authLimiter);
app.use(limiter); // Apply general rate limiter to all other routes

// 3. NoSQL Injection Prevention - Sanitize data
app.use(mongoSanitize({
  replaceWith: '_', // Replace prohibited characters with underscore
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized key detected: ${key}`);
  },
}));

// 4. Prevent HTTP Parameter Pollution
app.use(hpp());

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

console.log('CORS Configuration:', {
  corsAllowAll,
  allowedOrigins,
  frontendUrl: process.env.FRONTEND_URL
});

// CORS configuration with dynamic origin checking
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // If CORS_ALLOW_ALL is true, allow all origins
    if (corsAllowAll) {
      console.log(`CORS: Allowing origin ${origin} (CORS_ALLOW_ALL=true)`);
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`CORS: Allowing origin ${origin} (in allowedOrigins)`);
      return callback(null, true);
    }
    
    console.warn(`CORS: Blocking origin ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// 5. Body parser with size limits to prevent DOS
app.use(express.json({ limit: '100mb' })); // Increased body size limit to 100mb
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.use(morgan("dev"));
app.use(cookieParser());
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "./temp/",
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
    abortOnLimit: true,
  })
);

// 6. Sanitize all incoming requests
app.use(sanitizeRequest);

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
  pingTimeout: 120000, // 2 minutes
  maxHttpBufferSize: 1e8 // 100 MB
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
