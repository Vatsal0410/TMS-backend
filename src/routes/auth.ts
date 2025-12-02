import express from 'express';
import { changePassword, getCurrentUser, getSessions, login, logout, refreshToken, revokeSessions, setNewPassword } from '../controllers/authController';
import { authenticate, checkTempPassword } from '../middleware/auth';
import { requestPasswordResetOTP, verifyPasswordResetOTP } from '../controllers/otpController';

const router = express.Router();

//Public routes
router.post('/login', login)
router.post('/refresh-token', refreshToken)
router.post('/request-password-reset', requestPasswordResetOTP)
router.post('/verify-password-reset', verifyPasswordResetOTP)
router.put('/change-password', changePassword)


// Protected routes
router.get('/me', authenticate, checkTempPassword, getCurrentUser)
router.put('/set-new-password', authenticate, setNewPassword)
router.post('/logout', authenticate, logout)
router.get('/sessions', authenticate, getSessions)
router.post('/revoke-sessions', authenticate, revokeSessions)

export default router;