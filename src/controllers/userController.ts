import { NextFunction, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { User } from "../models/User";
import bcrypt from "bcryptjs";
import { generateTempPassword } from "../utils/passwordGenerator";
import { GlobalRole } from "../types/enums";
import { sendWelcomeEmail } from "../utils/emailService";

// Create a new user
export const createUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { fname, lname, email, globalRole } = req.body;

    if (!email || !fname || !globalRole) {
      res.status(400).json({
        message: "Email, First Name and Global Role are required.",
      });
      return;
    }

    const existingUser = await User.findOne({ email, isDeleted: false });

    if (existingUser) {
      res.status(409).json({
        message: "User with this email already exists.",
      });
      return;
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const user = new User({
      fname,
      lname,
      email,
      password: hashedPassword,
      tempPassword: hashedPassword,
      isTempPasswordActive: true,
      lastPasswordChange: null,
      globalRole,
      projectAssignments: [],
      isDeleted: false,
      createdBy: req.user._id,
    });

    await user.save();

    try {
      await sendWelcomeEmail(email, tempPassword, fname)
    }
    catch (emailError) {
      console.error('Failed to send welcome email: ', emailError)
    }

    const userResponse = await User.findById(user._id).select("-password");

    res.status(201).json({
      message: "User created successfully.",
      user: userResponse,
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get all users
export const getUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const users = await User.find({ isDeleted: false })
      .select("-password")
      .sort({ createAt: -1 });
    res.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get user by id
export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const user = await User.findOne({_id: id, isDeleted: false}).select('-password -tempPassword -resetPasswordOTP')

    if(!user) {
      res.status(404).json({ message: "User not found." });
      return
    }
    res.json({ user });
  }
  catch (error) {
    console.error("Get user by id error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

// Update user
export const updateUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { fname, lname, email, globalRole, isDeleted } = req.body;

    const user = await User.findById({ _id: id, isDeleted: false });

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    if (fname) user.fname = fname;
    if (lname) user.lname = lname;
    if (email) user.email = email;
    if (globalRole) user.globalRole = globalRole;
    if (typeof isDeleted === "boolean") user.isDeleted = isDeleted

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    res
      .status(200)
      .json({ message: "User updated successfully.", user: updatedUser });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Delete user
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if(id === req.user._id.toString()) {
      res.status(400).json({ message: "You cannot delete yourself." });
      return
    }

    const user = await User.findOne({ _id: id, isDeleted: false });
    if(!user) {
      res.status(404).json({ message: "User not found." });
      return
    }

    user.isDeleted = true
    user.deletedAt = new Date()
    user.deletedBy = req.user._id
    await user.save()

    res.json({ message: "User deleted successfully." });

  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

// Restore user
export const restoreUser = async(req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ _id: id, isDeleted: true });

    if(!user) {
      res.status(404).json({ message: "User not found." });
      return
    }

    user.isDeleted = false
    user.deletedAt = undefined
    user.deletedBy = undefined
    await user.save()

    res.json({ message: "User restored successfully." });
  }
  catch (error) {
    console.error("Restore user error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export const authorizeProject = (allowedProjectRoles: string[] = []) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    if (req.user.globalRole === GlobalRole.ADMIN) {
      return next();
    }

    const projectId = req.params.projectId;

    const projectAssignment = req.user.projectAssignments.find(
      (assignment: any) => assignment.projectId.toString() === projectId
    );

    if (!projectAssignment) {
      res
        .status(403)
        .json({ message: "You are not authorized to access this project." });
      return;
    }

    if (
      allowedProjectRoles.length > 0 &&
      !allowedProjectRoles.includes(projectAssignment.projectRole)
    ) {
      res.status(403).json({
        message: "Access denied. Insufficient project permissions.",
        requiredProjectRoles: allowedProjectRoles,
        userProjectRole: projectAssignment.projectRole,
      });
      return
    }
    next()
  };
};

