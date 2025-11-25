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

// Ensure seed users exist (idempotent)
const ensureSeedUsers = async () => {
  try {
    console.log("🧹 Checking existing users...");
    
    for (const userData of seedData.users) {
      const existingUser = await User.findOne({ email: userData.email }).select("_id email");
      
      if (existingUser) {
        console.log(`✅ User already exists: ${userData.email}`);
      } else {
        console.log(`➕ Creating user: ${userData.email}...`);
        const createdUser = await User.create(userData);
        console.log(`✅ User created: ${createdUser.email} (${createdUser.role})`);
      }
    }
  } catch (error) {
    console.error("❌ Error ensuring seed users:", error);
    throw error;
  }
};

// (bcrypt not needed; model pre-save will hash on creation)

// Main seed function
const seedDatabase = async () => {
  try {
    await connectDB();
    await ensureSeedUsers();
    console.log("\n✨ Database seeding complete!\n");
    console.log("\n🎉 Login with any of these accounts:");
    seedData.users.forEach(user => {
      console.log(`   Email: ${user.email}  Password: 123456  Role: ${user.role}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
};

// Run seeder
seedDatabase();
