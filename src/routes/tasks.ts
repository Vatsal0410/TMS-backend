import express from 'express';
import { authenticate, checkTempPassword } from '../middleware/auth';
import { createTask, createSubTask, deleteTask, getSubTasks, getTaskById, getTasks, restoreTask, updateTask, updateSubTask, deleteSubTask, restoreSubTask, getSubTaskById } from '../controllers/taskController';

const router = express.Router();

router.use(authenticate, checkTempPassword)

// Get all tasks and get task by id
router.get('/', getTasks)
router.get('/:id', getTaskById)

// Create, update, delete, restore task
router.post('/', createTask)
router.put('/:id', updateTask)
router.delete('/:id', deleteTask)
router.put('/:id/restore', restoreTask)

// Create, get, update, delete, restore subtask
router.get('/:id/subtasks', getSubTasks)
router.get('/:id/subTasks/:subTaskId', getSubTaskById)

router.post('/:id/subtasks', createSubTask);
router.put('/:id/subtasks/:subTaskId', updateSubTask)
router.delete('/:id/subtasks/:subTaskId', deleteSubTask)
router.put('/:id/subtasks/:subTaskId/restore', restoreSubTask)

export default router