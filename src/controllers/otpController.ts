import { Request, Response } from "express";
import { User } from "../models/User";
import { cleanupExpiredOTPs, createOTP, verifyOTP } from "../utils/otpService";
import { generateOTP } from "../utils/passwordGenerator";
import { sendPasswordResetOTP } from "../utils/emailService";
import { rmSync } from "fs";

// Request a password reset OTP
export const requestPasswordResetOTP = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: "Email is required." });
      return;
    }

    const user = await User.findOne({ email, isDeleted: false });

    if (!user) {
      res.json({ message: "If the email exists, an OTP will be sent." });
      return;
    }

    user.otpRequests = user.otpRequests.filter(otp => 
        otp.purpose !== 'PASSWORD_RESET'
    )

    const plainOTP = generateOTP();
    const otpData = await createOTP(plainOTP, "PASSWORD_RESET", 10);

    console.log("OTP Storage Debug:", {
      plainOTP: plainOTP,
      hashedOTP: otpData.code,
      hashedLength: otpData.code.length,
    });

    user.otpRequests.push(otpData);
    await user.save();

    try {
      await sendPasswordResetOTP(email, plainOTP, user.fname);
      res.json({
        message: "If the email exists, an OTP will be sent.",
        expiresAt: otpData.expiresAt,
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      res.status(500).json({ message: "Error sending email." });
    }
  } catch (error) {
    console.error("Request password reset OTP error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const verifyPasswordResetOTP = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ message: "Email and OTP are required." });
      return;
    }

    const user = await User.findOne({ email, isDeleted: false });
    if (!user) {
      res.status(404).json({ message: "Invalid OTP or user not found." });
      return;
    }

    const validOTP = user.otpRequests.find((otpReq) => {
      const isPurposeMatch = otpReq.purpose === "PASSWORD_RESET";
      const isNotUsed = !otpReq.used;
      const isNotExpired = otpReq.expiresAt > new Date();

      console.log("OTP Check:", {
        purpose: otpReq.purpose,
        used: otpReq.used,
        expiresAt: otpReq.expiresAt,
        now: new Date(),
        isPurposeMatch,
        isNotUsed,
        isNotExpired,
        isValid: isPurposeMatch && isNotUsed && isNotExpired,
      });

      return isPurposeMatch && isNotUsed && isNotExpired;
    });

    if (!validOTP) {
      res.status(404).json({ message: "OTP not found or expired." });
      return;
    }

    const isOTPValid = await verifyOTP(otp, validOTP.code);

    // ADD THIS DEBUG:
    console.log("OTP Comparison Debug:", {
      inputOTP: otp,
      storedOTP: validOTP.code,
      isOTPValid: isOTPValid,
      storedOTPLength: validOTP.code.length,
      storedOTPStartsWith: validOTP.code.substring(0, 10) + "...",
    });

    if (!isOTPValid) {
      res.status(404).json({ message: "Invalid OTP." });
      return;
    }

    validOTP.used = true;
    validOTP.usedAt = new Date();
    await user.save();

    res.json({
      message: "OTP verified successfully.",
      verified: true,
    });
  } catch (error) {
    console.error("Verify password reset OTP error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
