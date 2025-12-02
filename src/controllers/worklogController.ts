import mongoose from "mongoose";
import { Worklog } from "../models/Worklog";
import { Task } from "../models/Task";
import { AuthRequest } from "../middleware/auth";
import { Response } from "express";
import { GlobalRole } from "../types/enums";
import { Project } from "../models/Project";


// update task hours
const updateTaskHours = async (
  taskId: mongoose.Types.ObjectId,
  hourDifference?: number
): Promise<void> => {
  if (hourDifference !== undefined) {
    await Task.findByIdAndUpdate(taskId, {
      $inc: { actualHours: hourDifference },
    });
  } else {
    const result = await Worklog.aggregate([
      { $match: { taskId, isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$hours" } } },
    ]);
    const totalHours = result[0]?.total || 0;
    await Task.findByIdAndUpdate(taskId, { actualHours: totalHours });
  }
};

// check if user has worked overtime
const checkOvertime = async (
  userId: mongoose.Types.ObjectId,
  date: Date,
  additionalHours: number,
  excludeWorklogId?: mongoose.Types.ObjectId
): Promise<{
  isOvertime: boolean;
  dailyTotal: number;
  remainingAllowed: number;
}> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const matchConditions: any = {
    userId,
    date: { $gte: startOfDay, $lte: endOfDay },
    isDeleted: false,
  };

  if (excludeWorklogId) {
    matchConditions._id = { $ne: excludeWorklogId };
  }

  const result = await Worklog.aggregate([
    { $match: matchConditions },
    { $group: { _id: null, total: { $sum: "$hours" } } },
  ]);

  const dailyTotal = result[0]?.dailyTotal || 0;
  const DAILY_LIMIT = 8;

  const isOvertime = dailyTotal + additionalHours > DAILY_LIMIT;
  const remainingAllowed = Math.max(0, DAILY_LIMIT - dailyTotal);

  return { isOvertime, dailyTotal, remainingAllowed };
};

// create worklog
export const createWorklog = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { taskId, date, hours, description } = req.body;

    if (!taskId || !date || !hours || !description) {
      res.status(400).json({ message: "All fields are required." });
      return;
    }

    if (hours < 0.25 || hours > 24) {
      res.status(400).json({ message: "Hours must be between 0.25 and 24." });
      return;
    }

    const logDate = new Date(date);
    if (logDate > new Date()) {
      res.status(400).json({ message: "Date cannot be in the future." });
      return;
    }

    const task = await Task.findOne({
      _id: taskId,
      isDeleted: false,
    });

    if (!task) {
      res.status(404).json({ message: "Task not found." });
      return;
    }

    const projectid = task.projectId;
    const project = await Project.findOne({
      _id: projectid,
      isDeleted: false,
    });
    const isAssigned = task.assignedTo?.toString() === req.user._id.toString();
    const isProjectManager =
      project?.leaderId.toString() === req.user._id.toString();

    if (req.user.globalRole === GlobalRole.TEAM_MEMBER && !isAssigned) {
      if (task.assignedTo?.toString() !== req.user._id.toString()) {
        res.status(403).json({ message: "You are not assigned to this task." });
        return;
      }
    } else if (
      req.user.globalRole === GlobalRole.PROJECT_MANAGER &&
      !isProjectManager
    ) {
      if (project?.leaderId.toString() !== req.user._id.toString()) {
        res.status(403).json({ message: "You don't manage this project." });
        return;
      }
    }

    const isOvertimeCheck = await checkOvertime(req.user._id, logDate, hours);

    const worklog = new Worklog({
      taskId,
      userId: req.user._id,
      date: logDate,
      hours,
      description,
      isOvertime: isOvertimeCheck.isOvertime,
      isDeleted: false,
    });

    await worklog.save();

    await updateTaskHours(taskId, hours);

    const populatedWorklog = await Worklog.findById(worklog._id)
      .populate("taskId", "title taskNumber")
      .populate("userId", "fname lname email");

    res.status(201).json({
      message: "Worklog created successfully.",
      worklog: populatedWorklog,
      isOvertime: isOvertimeCheck,
    });
  } catch (error) {
    console.error("Create worklog error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get worklogs
export const getWorklogs = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { 
      taskId, 
      userId, 
      startDate, 
      endDate, 
      showOvertimeOnly,
      page = 1,
      limit = 50 
    } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    let query: any = {};

    if (taskId) query.taskId = taskId;
    if (userId) query.userId = userId;
    if (showOvertimeOnly === "true") query.isOvertime = true;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    if (req.user.globalRole === GlobalRole.TEAM_MEMBER) {
      query.userId = req.user._id;
    } else if (req.user.globalRole === GlobalRole.PROJECT_MANAGER) {
      const managerProjects = await Project.find({
        leaderId: req.user._id,
      }).select("_id");

      const projectIds = managerProjects.map((p) => p._id);
      const tasks = await Task.find({
        projectId: { $in: projectIds },
      }).select("_id");

      const taskIds = tasks.map((t) => t._id);
      query.taskId = { $in: taskIds };
    }

    const [worklogs, total] = await Promise.all([
      Worklog.find(query)
        .populate("taskId", "title taskNumber")
        .populate("userId", "fname lname email globalRole")
        .skip(skip)
        .limit(Number(limit))
        .sort({ date: -1, createdAt: -1 }),
      
      Worklog.countDocuments(query)
    ]);

    res.json({
      worklogs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error("Get worklogs error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get worklog by id
export const getWorklogById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const worklog = await Worklog.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate("taskId", "title taskNumber projectId")
      .populate("userId", "fname lname email globalRole");

    if (!worklog) {
      res.status(404).json({ message: "Worklog not found." });
      return;
    }

    const task = worklog.taskId as any;
    const project = task.projectId;

    const hasAccess =
      req.user.globalRole === GlobalRole.ADMIN ||
      req.user._id.toString() === worklog.userId._id.toString() ||
      (project && project.leaderId.toString() === req.user._id.toString());

    if (!hasAccess) {
      res.status(403).json({ message: "Access denied." });
      return;
    }

    res.json(worklog);
  } catch (error) {
    console.error("Get worklog by id error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// update worklog
export const updateWorklog = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { date, hours, description } = req.body;

    const worklog = await Worklog.findOne({
      _id: id,
      isDeleted: false,
    }).populate("userId", "_id");

    if (!worklog) {
      res.status(404).json({ message: "Worklog not found." });
      return;
    }

    const isOwner = worklog.userId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.globalRole === GlobalRole.ADMIN;

    let isProjectManager = false;

    if (!isOwner && !isAdmin) {
      const task = await Task.findById(worklog.taskId).populate(
        "projectId",
        "leaderId"
      );

      if (task) {
        const project = task.projectId as any;
        isProjectManager =
          project.leaderId.toString() === req.user._id.toString();
      }
    }

    if (!isOwner && !isAdmin && !isProjectManager) {
      res.status(403).json({ message: "Access denied." });
      return;
    }

    let hourDifference = 0;
    const originalHours = worklog.hours;

    if (date !== undefined) {
      const logDate = new Date(date);
      if (logDate > new Date()) {
        res.status(400).json({ message: "Date cannot be in the future." });
        return;
      }
      worklog.date = logDate;
    }

    if (hours !== undefined) {
      if (hours < 0.25 || hours > 24) {
        res.status(400).json({ message: "Hours must be between 0.25 and 24." });
        return;
      }
      hourDifference = hours - originalHours;
      worklog.hours = hours;
    }

    if (description !== undefined) {
      worklog.description = description;
    }

    if (date !== undefined || hours !== undefined) {
      const finalDate = worklog.date;
      const finalHours = worklog.hours;

      const overtimeCheck = await checkOvertime(
        worklog.userId._id,
        finalDate,
        finalHours,
        worklog._id
      );

      worklog.isOvertime = overtimeCheck.isOvertime;
    }

    await worklog.save();

    if (hourDifference !== 0) {
      await updateTaskHours(worklog.taskId, hourDifference);
    }

    const updatedWorklog = await Worklog.findById(id)
      .populate("taskId", "title taskNumber")
      .populate("userId", "fname lname email");

    res.json({
      message: "Worklog updated successfully.",
      worklog: updatedWorklog,
    });
  } catch (error) {
    console.error("Update worklog error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// delete worklog
export const deleteWorklog = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const worklog = await Worklog.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!worklog) {
      res.status(404).json({ message: "Worklog not found" });
      return;
    }

    const isOwner = worklog.userId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.globalRole === GlobalRole.ADMIN;

    let isProjectManager = false;
    if (!isOwner && !isAdmin) {
      const task = await Task.findById(worklog.taskId).populate(
        "projectId",
        "leaderId"
      );
      if (task) {
        const project = task.projectId as any;
        isProjectManager =
          project.leaderId.toString() === req.user._id.toString();
      }
    }

    if (!isOwner && !isAdmin && !isProjectManager) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    if (isOwner && !isAdmin && !isProjectManager) {
      const now = new Date();
      const created = new Date(worklog.createdAt);
      const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        res.status(403).json({
          message: "Can only delete worklog within 24 hours of creation",
        });
        return;
      }
    }

    worklog.isDeleted = true;
    worklog.deletedAt = new Date();
    worklog.deletedBy = req.user._id;
    await worklog.save();

    await updateTaskHours(worklog.taskId, -worklog.hours);

    res.json({ message: "Worklog deleted successfully" });
  } catch (error) {
    console.error("Delete worklog error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// restore worklog
export const restoreWorklog = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const worklog = await Worklog.findOne({
      _id: id,
      isDeleted: true,
    });

    if (!worklog) {
      res.status(404).json({ message: "Worklog not found" });
      return;
    }

    const isAdmin = req.user.globalRole === GlobalRole.ADMIN;
    const isOwner = worklog.userId.toString() === req.user._id.toString();

    let isProjectManager = false;
    if (!isAdmin && !isOwner) {
      const task = await Task.findById(worklog.taskId).populate(
        "projectId",
        "leaderId"
      );
      if (task) {
        const project = task.projectId as any;
        isProjectManager =
          project.leaderId.toString() === req.user._id.toString();
      }
    }

    if (!isAdmin && !isOwner && !isProjectManager) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    worklog.isDeleted = false;
    worklog.deletedAt = undefined;
    worklog.deletedBy = undefined;
    await worklog.save();

    await updateTaskHours(worklog.taskId, worklog.hours);

    res.json({
      message: "Worklog restored successfully",
    });
  } catch (error) {
    console.error("Restore worklog error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// get worklog summary
export const getWorklogSummary = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      startDate,
      endDate,
      groupBy = "user",
      projectId,
      userId,
      taskId,
    } = req.query;

    const matchConditions: any = { isDeleted: false };

    if (startDate || endDate) {
      matchConditions.date = {};
      if (startDate) {
        const start = new Date(startDate as string);
        start.setHours(0, 0, 0, 0);
        matchConditions.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        matchConditions.date.$lte = end;
      }
    }

    if (userId)
      matchConditions.userId = new mongoose.Types.ObjectId(userId as string);
    if (taskId)
      matchConditions.taskId = new mongoose.Types.ObjectId(taskId as string);

    if (req.user.globalRole === GlobalRole.TEAM_MEMBER) {
      matchConditions.userId = req.user._id;
    } else if (req.user.globalRole === GlobalRole.PROJECT_MANAGER) {
      const managerProjects = await Project.find({
        leaderId: req.user._id,
      }).select("_id");

      const projectIds = managerProjects.map((p) => p._id);
      const tasks = await Task.find({
        projectId: { $in: projectIds },
      }).select("_id");

      const taskIds = tasks.map((t) => t._id);
      matchConditions.taskId = { $in: taskIds };
    }

    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        res.status(404).json({ message: "Project not found." });
        return;
      }

      const hasAccess =
        req.user.globalRole === GlobalRole.ADMIN ||
        project.leaderId.toString() === req.user._id.toString() ||
        project.members.some(
          (m) => m.userId.toString() === req.user._id.toString()
        );

      if (!hasAccess) {
        res.status(403).json({ message: "Access denied to this project." });
        return;
      }

      const tasks = await Task.find({ projectId }).select("_id");
      const taskIds = tasks.map((t) => t._id);

      if (matchConditions.taskId) {
        if (Array.isArray(matchConditions.taskId.$in)) {
          matchConditions.taskId.$in = matchConditions.taskId.$in.filter(
            (id: mongoose.Types.ObjectId) =>
              taskIds.some((taskId) => taskId.toString() === id.toString()) 
          );
        } else {
          matchConditions.taskId = { $in: taskIds };
        }
      } else {
        matchConditions.taskId = { $in: taskIds };
      }
    }

    let groupStage: any;
    let projectStage: any[] = [];

    switch (groupBy) {
      case "task":
        groupStage = {
          _id: "$taskId",
          taskId: { $first: "$taskId" },
        };
        projectStage = [
          { taskTitle: "$task.title" },
          { taskNumber: "$task.taskNumber" },
          { projectTitle: { $ifNull: ["$project.title", "No Project"] } },
        ];
        break;

      case "project":
        groupStage = {
          _id: { $ifNull: ["$project._id", "unassigned"] },
          projectId: { $first: { $ifNull: ["$project._id", null] } },
        };
        projectStage = [
          { projectTitle: { $ifNull: ["$project.title", "Unassigned"] } },
        ];
        break;

      case "date":
        groupStage = {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" },
          },
        };
        projectStage = [{ date: "$_id" }];
        break;

      case "user":
      default:
        groupStage = {
          _id: "$userId",
          userId: { $first: "$userId" },
        };
        projectStage = [
          {
            userName: {
              $concat: ["$user.fname", " ", { $ifNull: ["$user.lname", ""] }],
            },
          },
          { userEmail: "$user.email" },
          { userRole: "$user.globalRole" },
        ];
    }

    const summary = await Worklog.aggregate([
      { $match: matchConditions },

      {
        $lookup: {
          from: "tasks",
          localField: "taskId",
          foreignField: "_id",
          as: "task",
        },
      },
      { $unwind: { path: "$task", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "projects",
          localField: "task.projectId",
          foreignField: "_id",
          as: "project",
        },
      },
      { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

      {
        $group: {
          ...groupStage,
          totalHours: { $sum: "$hours" },
          regularHours: {
            $sum: {
              $cond: [{ $eq: ["$isOvertime", false] }, "$hours", 0],
            },
          },
          overtimeHours: {
            $sum: {
              $cond: [{ $eq: ["$isOvertime", true] }, "$hours", 0],
            },
          },
          worklogCount: { $sum: 1 },
          avgHoursPerLog: { $avg: "$hours" },

          earliestDate: { $min: "$date" },
          latestDate: { $max: "$date" },

          ...(groupBy === "task" && {
            taskId: { $first: "$task._id" },
          }),
          ...(groupBy === "project" && {
            projectId: { $first: "$project._id" },
          }),
        },
      },

      {
        $project: {
          _id: 1,
          totalHours: 1,
          regularHours: 1,
          overtimeHours: 1,
          worklogCount: 1,
          avgHoursPerLog: { $round: ["$avgHoursPerLog", 2] },
          overtimePercentage: {
            $cond: [
              { $eq: ["$totalHours", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$overtimeHours", "$totalHours"] },
                  100,
                ],
              },
            ],
          },
          earliestDate: 1,
          latestDate: 1,

          ...Object.fromEntries(
            projectStage.map((item) => {
              const key = Object.keys(item)[0];
              return [key, item[key]];
            })
          ),
        },
      },

      {
        $project: {
          ...(groupBy === "date" && { date: "$_id" }),
          totalHours: { $round: ["$totalHours", 2] },
          regularHours: { $round: ["$regularHours", 2] },
          overtimeHours: { $round: ["$overtimeHours", 2] },
          overtimePercentage: { $round: ["$overtimePercentage", 2] },
          worklogCount: 1,
          avgHoursPerLog: 1,
          earliestDate: 1,
          latestDate: 1,
          ...(groupBy === "task" && {
            taskId: 1,
            taskTitle: 1,
            taskNumber: 1,
            projectTitle: 1,
          }),
          ...(groupBy === "project" && {
            projectId: 1,
            projectTitle: 1,
          }),
          ...(groupBy === "user" && {
            userId: 1,
            userName: 1,
            userEmail: 1,
            userRole: 1,
          }),
        },
      },

      { $sort: { totalHours: -1 } },
    ]);

    const overallStats = {
      totalHours: summary.reduce((sum, item) => sum + item.totalHours, 0),
      totalRegularHours: summary.reduce(
        (sum, item) => sum + item.regularHours,
        0
      ),
      totalOvertimeHours: summary.reduce(
        (sum, item) => sum + item.overtimeHours,
        0
      ),
      totalWorklogs: summary.reduce((sum, item) => sum + item.worklogCount, 0),
      averageHoursPerWorklog:
        summary.length > 0
          ? summary.reduce((sum, item) => sum + item.avgHoursPerLog, 0) /
            summary.length
          : 0,
    };

    res.json({
      success: true,
      summary,
      overallStats,
      groupBy,
      filters: {
        startDate,
        endDate,
        projectId,
        userId,
        taskId,
      },
      metadata: {
        count: summary.length,
        dateRange: {
          start: startDate || "unbounded",
          end: endDate || "unbounded",
        },
      },
    });
  } catch (error: any) {
    console.error("Get worklog summary error: ", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
