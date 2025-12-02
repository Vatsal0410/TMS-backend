import express from 'express'
import { authenticate, checkTempPassword } from '../middleware/auth'
import { createWorklog, deleteWorklog, getWorklogById, getWorklogs, getWorklogSummary, restoreWorklog, updateWorklog } from '../controllers/worklogController'

const router = express.Router()

// All routes require auth, password reset check
router.use(authenticate, checkTempPassword)

// Worklog analytics route
router.get('/insights', getWorklogSummary)

// Worklog management routes
router.post('/', createWorklog)
router.get('/', getWorklogs)
router.get('/:id', getWorklogById)
router.put('/:id', updateWorklog)
router.delete('/:id', deleteWorklog)
router.put('/:id/restore', restoreWorklog)

export default router
