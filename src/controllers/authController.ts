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

    // Generate refresh token and store in user document
    const refreshToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        type: 'refresh'
      },
      process.env.JWT_SECRET! + '-refresh',
      { expiresIn: "7d" }
    );

    // Store refresh token in user document
    user.refreshToken = refreshToken;
    await user.save();

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        globalRole: user.globalRole,
        type: 'access'
      },
      process.env.JWT_SECRET!,
      { expiresIn: "15m" }
    );

    const options = {
      httpOnly: true,
      secure: true,
    }

    res
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        fname: user.fname,
        lname: user.lname,
        email: user.email,
        globalRole: user.globalRole,
        avatar: user.avatar,
      },
      isTempPassword: isTempPassword,
      expiresIn: 900 // 15 minutes in seconds
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Logout
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { refreshToken: null }
    });

    res.json({ 
      message: "Logged out successfully.",
      logoutAt: new Date()
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: "Refresh token required." });
      return;
    }

    try {
      
      const decoded = jwt.verify(
        refreshToken, 
        process.env.JWT_SECRET! + '-refresh'
      ) as any;

      
      const user = await User.findOne({ 
        _id: decoded.id, 
        refreshToken: refreshToken,
        isDeleted: false 
      });

      if (!user) {
        res.status(401).json({ message: "Invalid refresh token." });
        return;
      }

      
      const newAccessToken = jwt.sign(
        {
          id: user._id,
          email: user.email,
          globalRole: user.globalRole,
          type: 'access'
        },
        process.env.JWT_SECRET!,
        { expiresIn: "15m" }
      );

      res.json({
        message: "Token refreshed successfully",
        accessToken: newAccessToken,
        expiresIn: 900
      });

    } catch (jwtError) {
      res.status(401).json({ message: "Invalid or expired refresh token." });
      return;
    }
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get sessions
export const getSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    
    const user = await User.findById(req.user._id).select('refreshToken lastActive');
    
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const currentSession = {
      hasActiveSession: !!user.refreshToken,
      lastActive: user.lastActive,
      currentDevice: true
    };

    res.json({
      sessions: [currentSession]
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Revoke sessions
export const revokeSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    
    await User.findByIdAndUpdate(req.user._id, {
      $set: { 
        refreshToken: null,
        lastActive: new Date()
      }
    });

    res.json({ 
      message: "All sessions revoked successfully.",
      revokedAt: new Date()
    });
  } catch (error) {
    console.error("Revoke sessions error:", error);
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

// Set new password
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

// Change password
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
