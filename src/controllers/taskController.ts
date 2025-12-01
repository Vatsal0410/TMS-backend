import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { IProject, IProjectMember, Project } from "../models/Project";
import { Task } from "../models/Task";
import { GlobalRole, TaskPriority, TaskStatus } from "../types/enums";
import { User } from "../models/User";

// Generate task number
const generateTaskNumber = async (projectId: string): Promise<string> => {
  const project = await Project.findById(projectId).select("title");
  if (!project) throw new Error("Project not found");

  const projectCode = project.title.substring(0, 3).toUpperCase();

  const taskCount = await Task.countDocuments({ projectId });

  return `${projectCode}-${taskCount + 1}`;
};

// Create task
export const createTask = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      title,
      description,
      projectId,
      assignedTo,
      parentTaskId,
      priority,
      estimatedHours,
      startDate,
      endDate,
    } = req.body;

    if (!title || !projectId) {
      res.status(400).json({ message: "Title and Project ID are required" });
      return;
    }

    const project = await Project.findOne({
      _id: projectId,
      isDeleted: false,
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const canCreate =
      req.user.globalRole === GlobalRole.ADMIN ||
      project.leaderId.toString() === req.user._id.toString();

    if (!canCreate) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    if (assignedTo) {
      const assignedUser = await User.findOne({
        _id: assignedTo,
        isDeleted: false,
        globalRole: GlobalRole.TEAM_MEMBER,
      });
      if (!assignedUser) {
        res.status(404).json({ message: "Assigned user not found" });
        return;
      }

      const isProjectMember = project.members.some(
        (member) => member.userId.toString() === assignedUser._id.toString()
      );
      if (!isProjectMember) {
        res
          .status(403)
          .json({ message: "Assigned user is not a member of the project" });
        return;
      }
    }

    if (parentTaskId) {
      const parentTask = await Task.findOne({
        _id: parentTaskId,
        projectId,
        isDeleted: false,
      });

      if (!parentTask) {
        res.status(404).json({ message: "Parent task not found" });
        return;
      }
    }

    const taskNumber = await generateTaskNumber(projectId);

    const task = new Task({
      taskNumber,
      title,
      description,
      projectId,
      assignedTo,
      parentTaskId,
      status: TaskStatus.PENDING,
      priority: priority || TaskPriority.LOW,
      estimatedHours,
      actualHours: 0,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      createdBy: req.user._id,
      isDeleted: false,
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("projectId", "title leaderId")
      .populate("assignedTo", "fname lname email globalRole")
      .populate("parentTaskId", "title taskNumber")
      .populate("createdBy", "fname lname email");

    res
      .status(201)
      .json({ message: "Task created successfully", task: populatedTask });
  } catch (error) {
    console.error("Create Task Error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all tasks with filters
export const getTasks = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    console.log("🔍 GET /api/tasks called");
    console.log("🔍 User ID:", req.user._id);
    console.log("🔍 User Role:", req.user.globalRole);
    console.log("🔍 Query params:", req.query);

    const { projectId, status, assignedTo, priority, search } = req.query;
    let query: any = {};

    if (projectId) {
      console.log("🔍 Project ID provided:", projectId);
      query.projectId = projectId;

      const project = await Project.findById(projectId);
      console.log("🔍 Found project:", project ? "YES" : "NO");

      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      const hasAccess =
        req.user.globalRole === GlobalRole.ADMIN ||
        project.leaderId.toString() === req.user._id.toString() ||
        project.members.some(
          (member: IProjectMember) =>
            member.userId.toString() === req.user._id.toString()
        );

      console.log("🔍 User has access to project:", hasAccess);

      if (!hasAccess) {
        res.status(403).json({ message: "Access denied" });
        return;
      }
    } else {
      console.log("🔍 No projectId provided - getting all user's projects");

      // As admin, you should see ALL projects
      if (req.user.globalRole === GlobalRole.ADMIN) {
        console.log("🔍 User is ADMIN - getting ALL projects");
        // Admin can see tasks from all projects
        const allProjects = await Project.find({}).select("_id");
        const projectIds = allProjects.map((project: IProject) => project._id);
        console.log("🔍 All project IDs:", projectIds);

        if (projectIds.length === 0) {
          console.log("🔍 No projects found in system");
          res.json({ tasks: [] });
          return;
        }
        query.projectId = { $in: projectIds };
      } else {
        // Non-admin users: get projects they're involved in
        const userProjects = await Project.find({
          $or: [
            { leaderId: req.user._id },
            { members: { $elemMatch: { userId: req.user._id } } },
          ],
        }).select("_id");

        const projectIds = userProjects.map((project: IProject) => project._id);
        console.log("🔍 User's project IDs:", projectIds);

        if (projectIds.length === 0) {
          console.log("🔍 User has no projects");
          res.json({ tasks: [] });
          return;
        }
        query.projectId = { $in: projectIds };
      }
    }

    // Add task filters
    query.isDeleted = false; // Only show non-deleted tasks

    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    if (priority) query.priority = priority;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { taskNumber: { $regex: search, $options: "i" } },
      ];
    }

    console.log("🔍 Final query:", JSON.stringify(query, null, 2));

    const tasks = await Task.find(query)
      .populate("projectId", "title")
      .populate("assignedTo", "fname lname email")
      .populate("parentTaskId", "title taskNumber")
      .populate("createdBy", "fname lname email")
      .sort({ createdAt: -1 });

    console.log("🔍 Found tasks:", tasks.length);
    console.log("🔍 Tasks:", tasks);

    res.json({ tasks });
  } catch (error) {
    console.error("Get tasks error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get Task by id
export const getTaskById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate("projectId", "title leaderId members")
      .populate("assignedTo", "fname lname email globalRole")
      .populate("parentTaskId", "title taskNumber")
      .populate("createdBy", "fname lname email")
      .populate("deletedBy", "fname lname email");

    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    const project = task.projectId as any;
    const hasAccess =
      req.user.globalRole === GlobalRole.ADMIN ||
      project.leaderId.toString() === req.user._id.toString() ||
      project.members.some(
        (member: any) => member.userId.toString() === req.user._id.toString()
      );

    if (!hasAccess) {
      res.status(403).json({
        message: "Access denied to this task.",
      });
      return;
    }

    res.json({ task });
  } catch (error) {
    console.error("Get task by id error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update task
export const updateTask = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      assignedTo,
      status,
      priority,
      estimatedHours,
      startDate,
      endDate,
      actualHours,
    } = req.body;

    const task = await Task.findOne({ _id: id, isDeleted: false }).populate(
      "projectId",
      "leaderId members"
    );
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    const project = task.projectId as any;

    let canUpdate = false;
    const isAdmin = req.user.globalRole === GlobalRole.ADMIN;
    const isProjectLeader =
      project.leaderId.toString() === req.user._id.toString();
    const isTaskAssignee =
      task.assignedTo?.toString() === req.user._id.toString();

    if (isAdmin || isProjectLeader || isTaskAssignee) {
      canUpdate = true;
    } else if (isTaskAssignee) {
      const allowedFields = ["status", "actualHours"];
      const requestedFields = Object.keys(req.body);

      const hasUnauthorizedField = requestedFields.some(
        (field) =>
          !allowedFields.includes(field) && req.body[field] !== undefined
      );

      if (hasUnauthorizedField) {
        res.status(403).json({
          message: "You can only update status and actual hours.",
        });
        return;
      }
      canUpdate = true;
    }

    if (!canUpdate) {
      res.status(403).json({
        message: "Access denied to update this task.",
      });
      return;
    }

    if (status && status !== task.status) {
      const validTransitions: Record<TaskStatus, TaskStatus[]> = {
        [TaskStatus.PENDING]: [TaskStatus.OPEN, TaskStatus.PENDING],
        [TaskStatus.OPEN]: [TaskStatus.IN_PROGRESS, TaskStatus.OPEN],
        [TaskStatus.IN_PROGRESS]: [TaskStatus.REVIEW, TaskStatus.IN_PROGRESS],
        [TaskStatus.REVIEW]: [
          TaskStatus.DONE,
          TaskStatus.IN_PROGRESS,
          TaskStatus.REVIEW,
        ],
        [TaskStatus.DONE]: [TaskStatus.DONE],
      };

      if (
        !validTransitions[task.status as TaskStatus]?.includes(
          status as TaskStatus
        )
      ) {
        res.status(400).json({
          message: `Invalid transition from ${task.status} to ${status}.`,
        });
        return;
      }

      if (status === TaskStatus.DONE) {
        task.completedAt = new Date();
      }
    }

    if (assignedTo && assignedTo !== task.assignedTo?.toString()) {
      const assignedToUser = await User.findOne({
        _id: assignedTo,
        isDeleted: false,
        globalRole: GlobalRole.TEAM_MEMBER,
      });

      if (!assignedToUser) {
        res.status(400).json({
          message: "Assigned  user must be an active team member.",
        });
        return;
      }

      const isProjectMember = project.members.some(
        (member: IProjectMember) =>
          member.userId.toString() === assignedTo.toString()
      );

      if (!isProjectMember) {
        res.status(400).json({
          message: "Assigned user is not a member of this project.",
        });
        return;
      }

      task.assignedTo = assignedTo;
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
    if (startDate !== undefined) task.startDate = startDate;
    if (endDate !== undefined) task.endDate = endDate;
    if (actualHours !== undefined) task.actualHours = actualHours;

    await task.save();

    const updatedTask = await Task.findById(id)
      .populate("projectId", "title")
      .populate("assignedTo", "fname lname email")
      .populate("parentTaskId", "title taskNumber")
      .populate("createdBy", "fname lname email");

    res.json({
      message: "Task updated successfully.",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update task error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete task
export const deleteTask = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await Task.findOne({ _id: id, isDeleted: false }).populate(
      "projectId",
      "title"
    );

    if (!task) {
      res.status(404).json({ message: "Task not found." });
      return;
    }

    const project = task.projectId as any;

    const canDelete =
      req.user.globalRole === GlobalRole.ADMIN ||
      project.leaderId.toString() === req.user._id.toString();

    if (!canDelete) {
      res.status(403).json({ message: "Access denied to delete this task." });
      return;
    }

    const hasSubTasks = await Task.exists({
      parentTaskId: task._id,
      isDeleted: false,
    });

    if (hasSubTasks) {
      res.status(400).json({ message: "Cannot delete task with subtasks." });
      return;
    }

    task.isDeleted = true;
    task.deletedAt = new Date();
    task.deletedBy = req.user._id;
    await task.save();

    res.json({ message: "Task deleted successfully." });
  } catch (error) {
    console.error("Delete task error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Restore task
export const restoreTask = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await Task.findOne({ _id: id, isDeleted: true }).populate(
      "projectId",
      "leaderId"
    );

    if (!task) {
      res.status(404).json({ message: "Deleted Task not found." });
      return;
    }

    const project = task.projectId as any;

    const canRestore =
      req.user.globalRole === GlobalRole.ADMIN ||
      project.leaderId.toString() === req.user._id.toString();

    if (!canRestore) {
      res.status(403).json({ message: "Access denied to restore this task." });
      return;
    }

    if (task.parentTaskId) {
      const parentTask = await Task.findOne({
        _id: task.parentTaskId,
        isDeleted: false,
      });

      if (!parentTask) {
        res.status(400).json({
          message: "Parent task is deleted or not found.",
        });
        return;
      }
    }

    task.isDeleted = false;
    task.deletedAt = undefined;
    task.deletedBy = undefined;

    await task.save();

    const restoredTask = await Task.findById(id)
      .populate("projectId", "title")
      .populate("assignedTo", "fname lname email")
      .populate("parentTaskId", "title taskNumber")
      .populate("createdBy", "fname lname email");

    res.json({
      message: "Task restored successfully.",
      task: restoredTask,
    });
  } catch (error) {
    console.error("Restore task error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create subtask
export const createSubTask = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: parentTaskId } = req.params;
    const {
      title,
      description,
      assignedTo,
      priority,
      estimatedHours,
      startDate,
      endDate,
    } = req.body;

    if (!title) {
      res.status(400).json({ message: "Title is required" });
      return;
    }

    // Get parent task
    const parentTask = await Task.findOne({
      _id: parentTaskId,
      isDeleted: false,
    }).populate("projectId", "title leaderId members");

    if (!parentTask) {
      res.status(404).json({ message: "Parent task not found" });
      return;
    }

    const project = parentTask.projectId as any;
    const projectId = project._id;

    // Check permissions (same as createTask)
    const canCreate =
      req.user.globalRole === GlobalRole.ADMIN ||
      project.leaderId.toString() === req.user._id.toString();

    if (!canCreate) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    // Determine assignee: Use provided OR inherit from parent task
    let finalAssignedTo = assignedTo || parentTask.assignedTo;

    // Validate assigned user if we have one
    if (finalAssignedTo) {
      const assignedUser = await User.findOne({
        _id: finalAssignedTo,
        isDeleted: false,
        globalRole: GlobalRole.TEAM_MEMBER,
      });
      
      if (!assignedUser) {
        res.status(404).json({ message: "Assigned user not found" });
        return;
      }

      const isProjectMember = project.members.some(
        (member: IProjectMember) =>
          member.userId.toString() === assignedUser._id.toString()
      );
      
      if (!isProjectMember) {
        res.status(403).json({ 
          message: "Assigned user is not a member of the project" 
        });
        return;
      }
    }

    // Generate task number (inherits from same project)
    const taskNumber = await generateTaskNumber(projectId.toString());

    // Create subtask
    const subTask = new Task({
      taskNumber,
      title,
      description,
      projectId,
      parentTaskId, // Automatically set from params
      assignedTo: finalAssignedTo, // Use determined assignee
      status: TaskStatus.PENDING,
      priority: priority || TaskPriority.LOW,
      estimatedHours,
      actualHours: 0,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      createdBy: req.user._id,
      isDeleted: false,
    });

    await subTask.save();

    // Populate and return
    const populatedSubTask = await Task.findById(subTask._id)
      .populate("projectId", "title leaderId")
      .populate("assignedTo", "fname lname email globalRole")
      .populate("parentTaskId", "title taskNumber")
      .populate("createdBy", "fname lname email");

    res.status(201).json({
      message: "Subtask created successfully",
      task: populatedSubTask,
      parentTask: {
        _id: parentTask._id,
        title: parentTask.title,
        taskNumber: parentTask.taskNumber,
        assignedTo: parentTask.assignedTo,
      },
    });
  } catch (error) {
    console.error("Create Subtask Error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get subtasks of a task
export const getSubTasks = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await Task.findOne({ _id: id, isDeleted: false }).populate(
      "projectId",
      "leaderId"
    );

    if (!task) {
      res.status(404).json({ message: "Task not found." });
      return;
    }

    const project = task.projectId as any;

    const hasAccess =
      req.user.globalRole === GlobalRole.ADMIN ||
      project.leaderId.toString() === req.user._id.toString() ||
      project.members.some(
        (member: IProjectMember) =>
          member.userId.toString() === req.user._id.toString()
      );

    if (!hasAccess) {
      res.status(403).json({ message: "Access denied." });
      return;
    }

    const subTasks = await Task.find({
      parentTaskId: task._id,
      isDeleted: false,
    })
      .populate("assignedTo", "fname lname email")
      .populate("createdBy", "fname lname email")
      .sort({ createdAt: -1 });

    res.json({ subTasks });
  } catch (error) {
    console.error("Get subtasks error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get subtask by ID
export const getSubTaskById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: parentTaskId, subTaskId } = req.params;

    console.log("Parent Task ID:", parentTaskId);
    console.log("Subtask ID:", subTaskId);

    // First verify parent task exists and user has access
    const parentTask = await Task.findOne({
      _id: parentTaskId,
      isDeleted: false,
    }).populate("projectId", "leaderId members");

    if (!parentTask) {
      res.status(404).json({ message: "Parent task not found" });
      return;
    }

    const project = parentTask.projectId as any;

    // Check access to parent task
    const hasAccess =
      req.user.globalRole === GlobalRole.ADMIN ||
      project.leaderId.toString() === req.user._id.toString() ||
      project.members.some(
        (member: IProjectMember) =>
          member.userId.toString() === req.user._id.toString()
      );

    if (!hasAccess) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    // Now find the subtask
    const subTask = await Task.findOne({
      _id: subTaskId,
      parentTaskId: parentTaskId, // Ensure it belongs to this parent
      isDeleted: false,
    })
      .populate("projectId", "title leaderId")
      .populate("assignedTo", "fname lname email globalRole")
      .populate("parentTaskId", "title taskNumber")
      .populate("createdBy", "fname lname email");

    if (!subTask) {
      res.status(404).json({ message: "Subtask not found" });
      return;
    }

    res.json({ task: subTask });
  } catch (error) {
    console.error("Get subtask by id error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update subtask
export const updateSubTask = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: parentTaskId, subTaskId } = req.params;
    const updates = req.body;

    // First verify parent task exists and user has access
    const parentTask = await Task.findOne({
      _id: parentTaskId,
      isDeleted: false,
    }).populate("projectId", "leaderId members");

    if (!parentTask) {
      res.status(404).json({ message: "Parent task not found" });
      return;
    }

    const project = parentTask.projectId as any;

    // Find subtask that belongs to this parent
    const subTask = await Task.findOne({
      _id: subTaskId,
      parentTaskId: parentTaskId, // CRITICAL: Check parent relationship
      isDeleted: false,
    });

    if (!subTask) {
      res.status(404).json({ message: "Subtask not found" });
      return;
    }

    // Check permissions
    const canUpdate =
      req.user.globalRole === GlobalRole.ADMIN ||
      project.leaderId.toString() === req.user._id.toString() ||
      subTask.assignedTo?.toString() === req.user._id.toString();

    if (!canUpdate) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    // If assignee is updating, restrict fields
    if (subTask.assignedTo?.toString() === req.user._id.toString() &&
        req.user.globalRole !== GlobalRole.ADMIN &&
        project.leaderId.toString() !== req.user._id.toString()) {

      const allowedFields = ["status", "actualHours"];
      const requestedFields = Object.keys(updates);

      const hasUnauthorizedField = requestedFields.some(
        field => !allowedFields.includes(field) && updates[field] !== undefined
      );

      if (hasUnauthorizedField) {
        res.status(403).json({
          message: "You can only update status and actual hours"
        });
        return;
      }
    }

    // Apply updates
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        (subTask as any)[key] = updates[key];
      }
    });

    await subTask.save();

    const updatedSubTask = await Task.findById(subTaskId)
      .populate("assignedTo", "fname lname email")
      .populate("parentTaskId", "title taskNumber");

    res.json({
      message: "Subtask updated successfully",
      task: updatedSubTask
    });
  } catch (error) {
    console.error("Update subtask error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete subtask (soft delete)
export const deleteSubTask = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: parentTaskId, subTaskId } = req.params;

    // First verify parent task exists
    const parentTask = await Task.findOne({
      _id: parentTaskId,
      isDeleted: false,
    }).populate("projectId", "leaderId");

    if (!parentTask) {
      res.status(404).json({ message: "Parent task not found" });
      return;
    }

    const project = parentTask.projectId as any;

    // Find subtask that belongs to this parent
    const subTask = await Task.findOne({
      _id: subTaskId,
      parentTaskId: parentTaskId, // CRITICAL: Check parent relationship
      isDeleted: false,
    });

    if (!subTask) {
      res.status(404).json({ message: "Subtask not found" });
      return;
    }

    // Only Admin or Project Leader can delete subtasks
    const canDelete =
      req.user.globalRole === GlobalRole.ADMIN ||
      project.leaderId.toString() === req.user._id.toString();

    if (!canDelete) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    // Check if subtask has its own subtasks
    const hasNestedSubTasks = await Task.exists({
      parentTaskId: subTask._id,
      isDeleted: false
    });

    if (hasNestedSubTasks) {
      res.status(400).json({
        message: "Cannot delete subtask with nested subtasks"
      });
      return;
    }

    // Soft delete
    subTask.isDeleted = true;
    subTask.deletedAt = new Date();
    subTask.deletedBy = req.user._id;

    await subTask.save();

    res.json({ message: "Subtask deleted successfully" });
  } catch (error) {
    console.error("Delete subtask error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Restore subtask
export const restoreSubTask = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id: parentTaskId, subTaskId } = req.params;

    // First verify parent task exists
    const parentTask = await Task.findOne({
      _id: parentTaskId,
      isDeleted: false,
    }).populate("projectId", "leaderId");

    if (!parentTask) {
      res.status(404).json({ message: "Parent task not found" });
      return;
    }

    const project = parentTask.projectId as any;

    // Find deleted subtask that belongs to this parent
    const subTask = await Task.findOne({
      _id: subTaskId,
      parentTaskId: parentTaskId, // CRITICAL: Check parent relationship
      isDeleted: true,
    });

    if (!subTask) {
      res.status(404).json({ message: "Deleted subtask not found" });
      return;
    }

    // Only Admin or Project Leader can restore subtasks
    const canRestore =
      req.user.globalRole === GlobalRole.ADMIN ||
      project.leaderId.toString() === req.user._id.toString();

    if (!canRestore) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    // Check if parent task still exists (already verified above)
    
    // Restore
    subTask.isDeleted = false;
    subTask.deletedAt = undefined;
    subTask.deletedBy = undefined;

    await subTask.save();

    const restoredSubTask = await Task.findById(subTaskId)
      .populate("assignedTo", "fname lname email")
      .populate("parentTaskId", "title taskNumber");

    res.json({
      message: "Subtask restored successfully",
      task: restoredSubTask
    });
  } catch (error) {
    console.error("Restore subtask error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};