import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from "../models/userModel.js";
import { seedData } from "./seedData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017/ICU";

console.log("\n🌱 Starting database seeding...\n");

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(mongoUrl);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Ensure only the admin user exists (idempotent)
const ensureAdminOnly = async () => {
  try {
    console.log("🧹 Removing all users except admin seed...");
    // Remove all users except one matching seed admin email (if exists kept)
    const adminEmail = seedData.users[0].email;
    await User.deleteMany({ email: { $ne: adminEmail } });
    const existingAdmin = await User.findOne({ email: adminEmail }).select("_id email");
    if (existingAdmin) {
      console.log("✅ Admin already exists, skipping creation");
      return existingAdmin;
    }
    console.log("➕ Creating admin user...");
    const [createdAdmin] = await User.create([seedData.users[0]]);
    console.log("✅ Admin created:", createdAdmin.email);
    return createdAdmin;
  } catch (error) {
    console.error("❌ Error ensuring admin user:", error);
    throw error;
  }
};

// (bcrypt not needed; model pre-save will hash on creation)

// Main seed function
const seedDatabase = async () => {
  try {
    await connectDB();
    await ensureAdminOnly();
    console.log("\n✨ Admin-only seeding complete!\n");
    console.log("\n🎉 Login with:");
    console.log("   Email: admin@demo.com  Password: 123456");
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
};

// Run seeder
seedDatabase();
