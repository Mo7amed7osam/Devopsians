import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from "../models/userModel.js";
import Hospital from "../models/hospitalmodel.js";
import { ICU } from "../models/roomModel.js";
import Task from "../models/taskModel.js";
import Feedback from "../models/feedbackModel.js";
import Service from "../models/serviceModel.js";
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

// Clear existing data
const clearDatabase = async () => {
  try {
    console.log("🗑️  Clearing existing data...");
    
    await User.deleteMany({});
    await Hospital.deleteMany({});
    await ICU.deleteMany({});
    await Task.deleteMany({});
    await Feedback.deleteMany({});
    await Service.deleteMany({});
    
    console.log("✅ Database cleared");
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    throw error;
  }
};

// Seed users
const seedUsers = async () => {
  try {
    console.log("👥 Seeding users...");
    
    // Just use User.create() - the pre-save hook will hash passwords
    const users = await User.create(seedData.users);
    console.log(`✅ Created ${users.length} users`);
    
    // Verify password hashing worked
    console.log('🔐 Verifying password for first user...');
    const firstUser = await User.findOne({ email: seedData.users[0].email }).select('+userPass');
    const passwordMatches = await bcrypt.compare('123456', firstUser.userPass);
    console.log(`   Password verification: ${passwordMatches ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    return users;
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    throw error;
  }
};

// Seed hospitals
const seedHospitals = async (users) => {
  try {
    console.log("🏥 Seeding hospitals...");
    
    const manager = users.find(u => u.role === "Manager");
    
    const hospitalsWithManager = seedData.hospitals.map(h => ({
      ...h,
      assignedManager: manager?._id
    }));
    
    const hospitals = await Hospital.create(hospitalsWithManager);
    console.log(`✅ Created ${hospitals.length} hospitals`);
    
    return hospitals;
  } catch (error) {
    console.error("❌ Error seeding hospitals:", error);
    throw error;
  }
};

// Seed ICUs
const seedICUs = async (hospitals) => {
  try {
    console.log("🛏️  Seeding ICUs...");
    
    const hospital1 = hospitals[0];
    const hospital2 = hospitals[1];
    
    // Assign ICUs to different hospitals
    const icusWithHospital = seedData.icus.map((icu, index) => ({
      ...icu,
      hospital: index % 2 === 0 ? hospital1._id : hospital2._id
    }));
    
    const icus = await ICU.create(icusWithHospital);
    console.log(`✅ Created ${icus.length} ICUs`);
    
    return icus;
  } catch (error) {
    console.error("❌ Error seeding ICUs:", error);
    throw error;
  }
};

// Seed tasks
const seedTasks = async (users) => {
  try {
    console.log("📋 Seeding tasks...");
    
    const doctor = users.find(u => u.role === "Doctor");
    const receptionist = users.find(u => u.role === "Receptionist");
    const ambulance = users.find(u => u.role === "Ambulance" && u.email === "ambulance1@demo.com");
    const manager = users.find(u => u.role === "Manager");
    
    const tasksWithUsers = [
      {
        ...seedData.tasks[0],
        assignedTo: doctor?._id,
        createdBy: manager?._id
      },
      {
        ...seedData.tasks[1],
        assignedTo: receptionist?._id,
        createdBy: manager?._id
      },
      {
        ...seedData.tasks[2],
        assignedTo: ambulance?._id,
        createdBy: manager?._id
      }
    ];
    
    const tasks = await Task.create(tasksWithUsers);
    console.log(`✅ Created ${tasks.length} tasks`);
    
    return tasks;
  } catch (error) {
    console.error("❌ Error seeding tasks:", error);
    throw error;
  }
};

// Seed feedbacks
const seedFeedbacks = async (users, hospitals) => {
  try {
    console.log("💬 Seeding feedbacks...");
    
    const patient1 = users.find(u => u.role === "Patient" && u.email === "patient@demo.com");
    const patient2 = users.find(u => u.role === "Patient" && u.email === "johndoe@demo.com");
    const patient3 = users.find(u => u.role === "Patient" && u.email === "janesmith@demo.com");
    const hospital = hospitals[0];
    
    const feedbacksWithUsers = [
      {
        ...seedData.feedbacks[0],
        user: patient1?._id,
        hospital: hospital._id
      },
      {
        ...seedData.feedbacks[1],
        user: patient2?._id,
        hospital: hospital._id
      },
      {
        ...seedData.feedbacks[2],
        user: patient3?._id,
        hospital: hospital._id
      }
    ];
    
    const feedbacks = await Feedback.create(feedbacksWithUsers);
    console.log(`✅ Created ${feedbacks.length} feedbacks`);
    
    return feedbacks;
  } catch (error) {
    console.error("❌ Error seeding feedbacks:", error);
    throw error;
  }
};

// Seed services
const seedServices = async (hospitals) => {
  try {
    console.log("🔧 Seeding services...");
    
    const hospital = hospitals[0];
    
    const servicesWithHospital = seedData.services.map(s => ({
      ...s,
      hospital: hospital._id
    }));
    
    const services = await Service.create(servicesWithHospital);
    console.log(`✅ Created ${services.length} services`);
    
    return services;
  } catch (error) {
    console.error("❌ Error seeding services:", error);
    throw error;
  }
};

// Main seed function
const seedDatabase = async () => {
  try {
    await connectDB();
    await clearDatabase();
    
    const users = await seedUsers();
    const hospitals = await seedHospitals(users);
    const icus = await seedICUs(hospitals);
    const tasks = await seedTasks(users);
    const feedbacks = await seedFeedbacks(users, hospitals);
    const services = await seedServices(hospitals);
    
    console.log("\n✨ Database seeding completed successfully!\n");
    console.log("📊 Summary:");
    console.log(`   - ${users.length} users`);
    console.log(`   - ${hospitals.length} hospitals`);
    console.log(`   - ${icus.length} ICUs`);
    console.log(`   - ${tasks.length} tasks`);
    console.log(`   - ${feedbacks.length} feedbacks`);
    console.log(`   - ${services.length} services`);
    console.log("\n🎉 You can now login with:");
    console.log("   Admin:        admin@demo.com / 123456");
    console.log("   Manager:      manager@demo.com / 123456");
    console.log("   Patient:      patient@demo.com / 123456");
    console.log("   Receptionist: receptionist@demo.com / 123456");
    console.log("   Ambulance 1:  ambulance1@demo.com / 123456");
    console.log("   Ambulance 2:  ambulance2@demo.com / 123456");
    console.log("   Ambulance 3:  ambulance3@demo.com / 123456\n");
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
};

// Run seeder
seedDatabase();
