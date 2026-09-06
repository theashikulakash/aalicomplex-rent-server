import jwt from "jsonwebtoken";
import User from "../models/User.js";

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// Verifies the JWT and attaches req.user (RBAC enforced at endpoint level below)
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);

    if (!user || user.status !== "active") {
      return res.status(401).json({ message: "Account not active" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Usage: requireRole("admin"), requireRole("admin", "collector")
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

// Allows the resource owner OR an admin (e.g. a Shop Owner viewing/editing own shop)
export function requireOwnerOrRole(getOwnerId, ...roles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (roles.includes(req.user.role)) return next();

    try {
      const ownerId = await getOwnerId(req);
      if (ownerId && ownerId.toString() === req.user._id.toString()) {
        return next();
      }
      return res.status(403).json({ message: "Insufficient permissions" });
    } catch (err) {
      next(err);
    }
  };
}
