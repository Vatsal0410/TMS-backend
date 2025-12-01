import bcrypt from "bcryptjs";
import { generateOTP } from "./passwordGenerator";

export const createOTP = async (plainOTP: string, purpose: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION', expiresInMinutes: number = 10) => {
    const hashedOTP = await bcrypt.hash(plainOTP, 8)
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000)

    return {
        code: hashedOTP,
        purpose,
        expiresAt,
        used: false,
        createdAt: new Date()
    }
}

export const verifyOTP = (inputOTP: string, storedOTP: string): Promise<boolean> => {
    console.log(bcrypt.compare(inputOTP, storedOTP))
    return bcrypt.compare(inputOTP, storedOTP)
}

export const cleanupExpiredOTPs = (otpRequests: any[]) => {
    const now = new Date()
    return otpRequests.filter(otp => otp.expiresAt > now && !otp.used)
}