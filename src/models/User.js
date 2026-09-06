import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

const USER_ROLES = ["admin", "owner", "collector"];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    photo: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: "owner" },

    // Admin approval gate for register-by-invite flow (PRD: register w/ invite/approval by Admin)
    status: {
      type: String,
      enum: ["pending", "active", "suspended"],
      default: "pending",
    },

    // Two-factor authentication for Admin role (best-practice suggestion)
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },

    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(plainPassword) {
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(plainPassword, salt);
};

userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.twoFactorSecret;
  return obj;
};

export const ROLES = USER_ROLES;
export default mongoose.model("User", userSchema);
