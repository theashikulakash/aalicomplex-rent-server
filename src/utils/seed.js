// One-time bootstrap: creates the first Admin account so someone can log in
// and approve everyone else. Run with: npm run seed
import "dotenv/config";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import mongoose from "mongoose";

async function seed() {
  await connectDB();

  const email = process.env.SEED_ADMIN_EMAIL || "admin@akkelali.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`[seed] Admin already exists: ${email}`);
  } else {
    const admin = new User({
      name: "Property Admin",
      email,
      role: "admin",
      status: "active",
    });
    await admin.setPassword(password);
    await admin.save();
    console.log(`[seed] Admin created -> email: ${email} password: ${password}`);
    console.log("[seed] Log in and change this password immediately.");
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
