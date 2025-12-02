import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { IProjectMember, Project } from "../models/Project";
import { GlobalRole, ProjectRole, ProjectStatus } from "../types/enums";
import { User } from "../models/User";
import mongoose from "mongoose";

// Create project
export const createProject = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      leaderId,
      members = [],
    } = req.body;

    if (!title || !description || !startDate || !endDate || !leaderId) {
      res.status(400).json({ message: "All fields are required." });
      return;
    }

    const leader = await User.findOne({
      _id: leaderId,
      isDeleted: false,
    });

    if (!leader) {
      res.status(400).json({
        message: "Project leader not found.",
      });
      return;
    }

    if (leader.globalRole !== GlobalRole.PROJECT_MANAGER) {
      res.status(400).json({
        message: `Project leader must be a project manager. Current role: ${leader.globalRole}`,
      });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      res.status(400).json({ message: "Start date must be before end date." });
      return;
    }

    const memberIds = members.map(
      (m: IProjectMember) => new mongoose.Types.ObjectId(m.userId)
    );
    const validUsers = await User.find({
      _id: { $in: memberIds },
      isDeleted: false,
      globalRole: GlobalRole.TEAM_MEMBER,
    }).select("_id");

    const validUserIds = validUsers.map((u) => u._id.toString());
    const validatedMembers = [];

    for (const member of members) {
      if (!validUserIds.includes(member.userId.toString())) {
        res.status(400).json({
          message: `User ${member.userId} is not a valid team member.`,
        });
        return;
      }

      validatedMembers.push({
        userId: member.userId,
        projectRole: member.projectRole,
        assignedAt: new Date(),
        assignedBy: req.user._id,
      });
    }

    const leaderAlreadyInMembers = members.some(
      (m: IProjectMember) => m.userId.toString() === leaderId.toString()
    );

    if (!leaderAlreadyInMembers) {
      validatedMembers.push({
        userId: leaderId,
        projectRole: ProjectRole.LEADER,
        assignedAt: new Date(),
        assignedBy: req.user._id,
      });
    }

    const project = new Project({
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: ProjectStatus.PLANNING,
      leaderId: leaderId,
      members: validatedMembers,
      isDeleted: false,
      createdBy: req.user._id,
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate("leaderId", "id fname lname email globalRole")
      .populate("members.userId", "id fname lname email globalRole")
      .populate("createdBy", "id fname lname email globalRole");

    res.status(201).json({
      message: "Project created successfully.",
      project: populatedProject,
    });
  } catch (error: any) {
    console.error("Create project error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get all projects
export const getProjects = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    let query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search as string, $options: "i" } },
        { description: { $regex: search as string, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (startDateFrom || startDateTo) {
      query.startDate = {};
      if (startDateFrom) {
        const startFrom = new Date(startDateFrom as string);
        startFrom.setHours(0, 0, 0, 0);
        query.startDate.$gte = startFrom;
      }
      if (startDateTo) {
        const startTo = new Date(startDateTo as string);
        startTo.setHours(23, 59, 59, 999);
        query.startDate.$lte = startTo;
      }
    }

    if (endDateFrom || endDateTo) {
      query.endDate = {};
      if (endDateFrom) {
        const endFrom = new Date(endDateFrom as string);
        endFrom.setHours(0, 0, 0, 0);
        query.endDate.$gte = endFrom;
      }
      if (endDateTo) {
        const endTo = new Date(endDateTo as string);
        endTo.setHours(23, 59, 59, 999);
        query.endDate.$lte = endTo;
      }
    }

    if (req.user.globalRole === GlobalRole.TEAM_MEMBER) {
      query["members.userId"] = req.user._id;
    } else if (req.user.globalRole === GlobalRole.PROJECT_MANAGER) {
      query.$or = [
        { leaderId: req.user._id },
        { "members.userId": req.user._id },
      ];
    }

    const [projects, total, activeProjectsCount] = await Promise.all([
      Project.find(query)
        .populate("leaderId", "id fname lname email globalRole")
        .populate("members.userId", "id fname lname email globalRole")
        .populate("createdBy", "id fname lname email globalRole")
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),

      Project.countDocuments(query),

      Project.countDocuments({ isDeleted: false }),
    ]);

    res.json({
      projects,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
      stats: {
        activeProjects: activeProjectsCount,
        totalProjects: total,
        showing: projects.length,
      },
      filters: {
        search: search || null,
        status: status || null,
        startDateFrom: startDateFrom || null,
        startDateTo: startDateTo || null,
        endDateFrom: endDateFrom || null,
        endDateTo: endDateTo || null,
      },
    });
  } catch (error) {
    console.error("Get projects error: ", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get project by ID
export const getProjectById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await Project.findOne({ _id: id })
      .populate("leaderId", "id fname lname email globalRole")
      .populate("members.userId", "id fname lname email globalRole")
      .populate("createdBy", "id fname lname email")
      .populate("deletedBy", "id fname lname email");

    if (!project) {
      res.status(404).json({ message: "Project not found." });
      return;
    }

    const hasAccess =
      req.user.globalRole === GlobalRole.ADMIN ||
      project.leaderId._id.toString() === req.user._id.toString() ||
      project.members.some(
        (member: any) =>
          member.userId._id.toString() === req.user._id.toString()
      );

    if (!hasAccess) {
      res.status(403).json({ message: "Access denied to this project." });
      return;
    }

    res.json({ project });
  } catch (error) {
    console.error("Get project by ID error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Update project
export const updateProject = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      startDate,
      endDate,
      status,
      leaderId,
      members,
    } = req.body;

    const project = await Project.findOne({ _id: id, isDeleted: false });
    if (!project) {
      res.status(404).json({ message: "Project not found." });
      return;
    }

    const canUpdate =
      req.user.globalRole === GlobalRole.ADMIN ||
      project.leaderId.toString() === req.user._id.toString();

    if (!canUpdate) {
      res
        .status(403)
        .json({ message: "Access denied to update this project." });
      return;
    }

    const currentLeaderId = leaderId || project.leaderId;

    if (members !== undefined) {
      const uniqueUserIds = new Set<string>();
      const validatedMembers: IProjectMember[] = [];

      for (const member of members) {
        if (uniqueUserIds.has(member.userId.toString())) {
          res.status(400).json({
            message: `Duplicate user ${member.userId} in members array.`,
          });
          return;
        }

        uniqueUserIds.add(member.userId.toString());

        const user = await User.findOne({
          _id: member.userId,
          isDeleted: false,
        });

        if (!user) {
          res.status(400).json({
            message: `User ${member.userId} not found.`,
          });
          return;
        }

        if (
          user.globalRole !== GlobalRole.TEAM_MEMBER &&
          user.globalRole !== GlobalRole.PROJECT_MANAGER
        ) {
          res.status(400).json({
            message: `User ${member.userId} must be a team member or project manager.`,
          });
          return;
        }

        validatedMembers.push(member);
      }

      const leaderInMembers = validatedMembers.some(
        (member) => member.userId.toString() === currentLeaderId.toString()
      );

      if (!leaderInMembers) {
        validatedMembers.push({
          userId: currentLeaderId,
          projectRole: ProjectRole.LEADER,
        });
      }

      const updatedMembers = validatedMembers.map((member) => {
        const existingMember = project.members.find(
          (m: any) => m.userId.toString() === member.userId.toString()
        );

        if (existingMember) {
          return {
            userId: member.userId,
            projectRole: member.projectRole || existingMember.projectRole,
            assignedAt: existingMember.assignedAt,
            assignedBy: existingMember.assignedBy,
          };
        }

        return {
          userId: member.userId,
          projectRole: member.projectRole,
          assignedAt: new Date(),
          assignedBy: req.user._id,
        };
      });

      const finalLeaderCheck = updatedMembers.some(
        (member) => member.userId.toString() === currentLeaderId.toString()
      );

      if (!finalLeaderCheck) {
        res.status(400).json({
          message: "Leader must be in members array.",
        });
        return;
      }

      project.members = updatedMembers;
    }

    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (startDate !== undefined) project.startDate = new Date(startDate);
    if (endDate !== undefined) project.endDate = new Date(endDate);
    if (status !== undefined) project.status = status;

    if (leaderId !== undefined && leaderId !== project.leaderId.toString()) {
      const newLeader = await User.findOne({
        _id: leaderId,
        isDeleted: false,
        globalRole: GlobalRole.PROJECT_MANAGER,
      });

      if (!newLeader) {
        res.status(400).json({
          message: "Project leader must be an active project manager.",
        });
        return;
      }

      project.leaderId = leaderId;

      if (project.members) {
        const leaderMember = project.members.find(
          (m: any) => m.userId.toString() === leaderId.toString()
        );
        if (leaderMember) {
          leaderMember.projectRole = ProjectRole.LEADER;
        }
      }
    }

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate("leaderId", "id fname lname email globalRole")
      .populate("members.userId", "id fname lname email globalRole")
      .populate("createdBy", "id fname lname email");

    res.json({
      message: "Project updated successfully.",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Delete project
export const deleteProject = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await Project.findOne({ _id: id, isDeleted: false });
    if (!project) {
      res.status(404).json({ message: "Project not found." });
      return;
    }

    if (req.user.globalRole !== GlobalRole.ADMIN) {
      res.status(403).json({ message: "Only admin can delete projects." });
      return;
    }

    project.isDeleted = true;
    project.deletedAt = new Date();
    project.deletedBy = req.user._id;
    await project.save();

    res.json({ message: "Project deleted successfully." });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Restore project
export const restoreProject = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await Project.findOne({ _id: id, isDeleted: true });

    if (!project) {
      res.status(404).json({ message: "Project not found." });
      return;
    }

    if (req.user.globalRole !== GlobalRole.ADMIN) {
      res.status(403).json({ message: "Only admin can restore projects." });
      return;
    }

    project.isDeleted = false;
    project.deletedAt = undefined;
    project.deletedBy = undefined;
    await project.save();

    res.json({ message: "Project restored successfully." });
  } catch (error) {
    console.error("Restore project error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get project stats
export const getProjectStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    let query: any = { isDeleted: false };

    if (req.user.globalRole === GlobalRole.TEAM_MEMBER) {
      query["members.userId"] = req.user._id;
    } else if (req.user.globalRole === GlobalRole.PROJECT_MANAGER) {
      query.$or = [
        { leaderId: req.user._id },
        { "members.userId": req.user._id },
      ];
    }

    const statusStats = await Project.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalMembers: { $sum: { $size: "$members" } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const today = new Date();
    const overdueProjects = await Project.countDocuments({
      ...query,
      endDate: { $lt: today },
      status: { $ne: ProjectStatus.COMPLETED },
    });

    const totalProjects = await Project.countDocuments(query);

    const avgTeamSizeResult = await Project.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          avgTeamSize: { $avg: { $size: "$members" } },
          minTeamSize: { $min: { $size: "$members" } },
          maxTeamSize: { $max: { $size: "$members" } },
        },
      },
    ]);

    const timelineStats = await Project.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          earliestStart: { $min: "$startDate" },
          latestEnd: { $max: "$endDate" },
          avgDurationDays: {
            $avg: {
              $divide: [
                { $subtract: ["$endDate", "$startDate"] },
                1000 * 60 * 60 * 24, // Convert ms to days
              ],
            },
          },
        },
      },
    ]);

    res.json({
      statusDistribution: statusStats,
      totals: {
        totalProjects,
        overdueProjects,
        completedProjects:
          statusStats.find((s) => s._id === ProjectStatus.COMPLETED)?.count ||
          0,
        activeProjects:
          statusStats.find((s) => s._id === ProjectStatus.ACTIVE)?.count || 0,
      },
      teamStats: {
        averageTeamSize: avgTeamSizeResult[0]?.avgTeamSize
          ? Math.round(avgTeamSizeResult[0].avgTeamSize * 100) / 100
          : 0,
        minTeamSize: avgTeamSizeResult[0]?.minTeamSize || 0,
        maxTeamSize: avgTeamSizeResult[0]?.maxTeamSize || 0,
        totalTeamMembers: statusStats.reduce(
          (sum, stat) => sum + stat.totalMembers,
          0
        ),
      },
      timeline: {
        earliestStartDate: timelineStats[0]?.earliestStart || null,
        latestEndDate: timelineStats[0]?.latestEnd || null,
        averageDurationDays: timelineStats[0]?.avgDurationDays
          ? Math.round(timelineStats[0].avgDurationDays * 100) / 100
          : 0,
      },
    });
  } catch (error) {
    console.error("Get project stats error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
