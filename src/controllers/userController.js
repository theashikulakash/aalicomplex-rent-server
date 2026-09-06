import User from "../models/User.js";

// GET /api/users/owners  (Public owner directory)
export async function listOwners(req, res, next) {
  try {
    const owners = await User.find({ role: "owner", status: "active" })
      .select("name email phone photo")
      .sort({ name: 1 });
    res.json({ owners });
  } catch (err) {
    next(err);
  }
}

// GET /api/users  (Admin: list all; supports ?role=&status=)
export async function listUsers(req, res, next) {
  try {
    const { role, status } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ users: users.map((u) => u.toSafeJSON()) });
  } catch (err) {
    next(err);
  }
}

// POST /api/users  (Admin creates a user directly, e.g. a Rent Collector)
export async function createUser(req, res, next) {
  try {
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "name, email, password and role are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const user = new User({ name, email, phone, role, status: "active" });
    await user.setPassword(password);
    await user.save();

    res.status(201).json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id  (Admin: approve/suspend/change role, or self-update profile fields)
export async function updateUser(req, res, next) {
  try {
    const isSelf = req.params.id === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const allowedFields = isAdmin
      ? ["name", "phone", "role", "status", "twoFactorEnabled"]
      : ["name", "email", "phone", "photo"]; // non-admins can only update their own profile

    const updates = {};
    for (const field of allowedFields) {
      if (field in req.body) updates[field] = req.body[field];
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/users/:id  (Admin only)
export async function deleteUser(req, res, next) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
}
