import express from 'express';
import { authenticate, checkTempPassword } from '../middleware/auth';
import { createTask, createSubTask, deleteTask, getSubTasks, getTaskById, getTasks, restoreTask, updateTask, updateSubTask, deleteSubTask, restoreSubTask, getSubTaskById, getTaskStats } from '../controllers/taskController';

const router = express.Router();

// All routes require auth, password reset check
router.use(authenticate, checkTempPassword)

// Task analytics route
router.get('/insights', getTaskStats)

// Task retrieval routes
router.get('/', getTasks)
router.get('/:id', getTaskById)

// Task management routes
router.post('/', createTask)
router.put('/:id', updateTask)
router.delete('/:id', deleteTask)
router.put('/:id/restore', restoreTask)

// Subtask retrieval routes
router.get('/:id/subtasks', getSubTasks)
router.get('/:id/subTasks/:subTaskId', getSubTaskById)

// Subtask management routes
router.post('/:id/subtasks', createSubTask);
router.put('/:id/subtasks/:subTaskId', updateSubTask)
router.delete('/:id/subtasks/:subTaskId', deleteSubTask)
router.put('/:id/subtasks/:subTaskId/restore', restoreSubTask)

export default router