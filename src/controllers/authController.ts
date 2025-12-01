import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { AuthRequest } from "../middleware/auth";
import { validatePasswordStrength } from "../utils/passwordValidator";

// Login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

    const user = await User.findOne({ email, isDeleted: false });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          lastActive: new Date(),
        },
      },
      { timestamps: false }
    );

    const isTempPassword = user.isTempPasswordActive;

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        globalRole: user.globalRole,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fname: user.fname,
        lname: user.lname,
        email: user.email,
        globalRole: user.globalRole,
        avatar: user.avatar,
      },
      isTempPassword: isTempPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get current user
export const getCurrentUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.json({
      user: {
        id: user._id,
        fname: user.fname,
        lname: user.lname,
        email: user.email,
        globalRole: user.globalRole,
        avatar: user.avatar,
        projectAssignments: user.projectAssignments,
        lastActive: user.lastActive,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const setNewPassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { newPassword } = req.body;
    const userId = req.user._id;

    if (!newPassword) {
      res.status(400).json({ message: "New password is required." });
      return;
    }

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      res.status(400).json({ message: passwordError });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    if (!user.isTempPasswordActive) {
      res.status(400).json({ message: "Password already set." });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.isTempPasswordActive = false;
    user.lastPasswordChange = new Date();
    user.tempPassword = "";

    await user.save();

    res.json({
      message: "Password set successfully.",
    });
  } catch (error) {
    console.error("Set new password error: ", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const changePassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      res
        .status(400)
        .json({ message: "Email, OTP, and new password are required." });
      return;
    }

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      res.status(400).json({ message: passwordError });
      return;
    }

    const user = await User.findOne({ email, isDeleted: false });
    if (!user) {
      res.status(404).json({ message: "Invalid request." });
      return;
    }

    const usedOTP = user.otpRequests.find(
      (otpReq) =>
        otpReq.purpose === "PASSWORD_RESET" &&
        otpReq.used &&
        otpReq.usedAt &&
        Date.now() - otpReq.usedAt.getTime() < 5 * 60 * 1000
    );

    if (!usedOTP) {
      res.status(404).json({ message: "OTP verfication required first." });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.lastPasswordChange = new Date();

    if (user.isTempPasswordActive) {
      user.isTempPasswordActive = false;
      user.tempPassword = "";
    }

    await user.save();

    res.json({
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
