import express from 'express';
import { createProject, deleteProject, getProjectById, getProjects, restoreProject, updateProject } from '../controllers/projectController';
import { authenticate, checkTempPassword, requireAdmin } from '../middleware/auth';

const router = express.Router()

router.use(authenticate, checkTempPassword)

router.post('/', requireAdmin, createProject)
router.get('/', getProjects)
router.get('/:id', getProjectById)
router.put('/:id', requireAdmin, updateProject)
router.delete('/:id', requireAdmin, deleteProject)
router.put('/:id/restore', requireAdmin, restoreProject)

export default router
