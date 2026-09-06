import User from "../models/User.js";
import { signToken } from "../middleware/auth.js";

// POST /api/auth/register
// New accounts default to role "owner" and status "pending" until an Admin
// approves them (PRD: register w/ invite/approval by Admin).
export async function register(req, res, next) {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const user = new User({
      name,
      email,
      phone,
      role: ["owner", "collector"].includes(role) ? role : "owner",
      status: "pending",
    });
    await user.setPassword(password);
    await user.save();

    res.status(201).json({
      message: "Registration submitted. An admin must approve this account before login.",
      user: user.toSafeJSON(),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: `Account is ${user.status}. Contact an admin.` });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
export async function me(req, res) {
  res.json({ user: req.user.toSafeJSON() });
}
