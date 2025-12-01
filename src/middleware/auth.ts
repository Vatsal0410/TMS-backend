import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { GlobalRole } from "../types/enums";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ message: "Access denied. No token provided" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await User.findById(decoded.id).select("-password");


    if (!user || user.isDeleted) {
      res.status(401).json({ message: "Token is invalid or user not found" });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const authorize = (...allowedRoles: GlobalRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {

    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.globalRole)) {
      res.status(403).json({
        message: "Access denied. Insufficient permissions.",
        requiredRole: allowedRoles,
        userRole: req.user.globalRole,
      });
      return;
    }
    next();
  };
};

export const checkTempPassword = (req:AuthRequest, res: Response, next: NextFunction): void => {
  if(!req.user) {
    res.status(401).json({ message: 'Authentication required.' });
    return
  }

  if(req.user.isTempPasswordActive && !req.path.includes('/set-new-password')) {
    res.status(403).json({
      message: 'Password reset required.',
      requiresPasswordReset: true
    })
    return
  }
  next()
}

export const requireAdmin = authorize(GlobalRole.ADMIN);
export const requireManager = authorize(
  GlobalRole.ADMIN,
  GlobalRole.PROJECT_MANAGER
);
