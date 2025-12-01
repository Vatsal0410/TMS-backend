import express from 'express';
import { changePassword, getCurrentUser, login, setNewPassword } from '../controllers/authController';
import { authenticate, checkTempPassword } from '../middleware/auth';
import { requestPasswordResetOTP, verifyPasswordResetOTP } from '../controllers/otpController';

const router = express.Router();

//Public routes
router.post('/login', login)
router.post('/request-password-reset', requestPasswordResetOTP)
router.post('/verify-password-reset', verifyPasswordResetOTP)
router.put('/change-password', changePassword)


// Protected routes
router.get('/me', authenticate, checkTempPassword, getCurrentUser)
router.put('/set-new-password', authenticate, setNewPassword)

export default router;