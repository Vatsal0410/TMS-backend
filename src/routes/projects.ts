import express from 'express';
import { createProject, deleteProject, getProjectById, getProjects, getProjectStats, restoreProject, updateProject } from '../controllers/projectController';
import { authenticate, checkTempPassword, requireAdmin } from '../middleware/auth';

const router = express.Router()

// Apply authentication and temp password check to all routes
router.use(authenticate, checkTempPassword)

// Analytics routes
router.get('/analytics/stats', getProjectStats)

// Public project routes
router.get('/', getProjects)
router.get('/:id', getProjectById)

// Private project routes
router.post('/', requireAdmin, createProject)
router.put('/:id', checkTempPassword, updateProject)
router.delete('/:id', requireAdmin, deleteProject)
router.put('/:id/restore', requireAdmin, restoreProject)


export default router
