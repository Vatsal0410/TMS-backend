import express from 'express';
import { createUser, deleteUser, getUserById, getUsers, restoreUser, updateUser } from '../controllers/userController';
import { authenticate, checkTempPassword, requireAdmin } from '../middleware/auth';

const router = express.Router();

// All routes require auth, password reset check, and admin role
router.use(authenticate, checkTempPassword, requireAdmin)

router.post('/', createUser);
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/restore', restoreUser);

export default router;