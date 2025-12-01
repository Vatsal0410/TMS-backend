import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { IProjectMember, Project } from "../models/Project";
import { GlobalRole, ProjectRole, ProjectStatus } from "../types/enums";
import { User } from "../models/User";

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
        message: "Project manager must be an active project manager.",
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

    const validatedMembers = [];
    // FIXME: Members validation uses a loop of separate DB queries. Use a single $in query for all members.
    for (const member of members) {
      const user = await User.findOne({
        _id: member.userId,
        isDeleted: false,
        globalRole: GlobalRole.TEAM_MEMBER,
      });

      if (!user) {
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

    // FIXME: Leader is added to members without validation of duplicates
    validatedMembers.push({
      userId: leaderId,
      projectRole: "Project Manager",
      assignedAt: new Date(),
      assignedBy: req.user._id,
    });

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
    console.error("🔥 Create project error:", error);
    console.error("🔥 Error stack:", error.stack);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get all projects
export const getProjects = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    let query: any = {};

    if (req.user.globalRole === GlobalRole.TEAM_MEMBER) {
      query["members.userId"] = req.user._id;
    } else if (req.user.globalRole === GlobalRole.PROJECT_MANAGER) {
      query.$or = [
        { leaderId: req.user._id },
        { "members.userId": req.user._id },
      ];
    } else if (req.user.globalRole === GlobalRole.ADMIN) {
    }

    const projects = await Project.find(query)
      .populate("leaderId", "id fname lname email globalRole")
      .populate("members.userId", "id fname lname email globalRole")
      .populate("createdBy", "id fname lname email globalRole")
      .sort({ createdAt: -1 });

    res.json({ projects });
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

    // Check access permissions
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

    // Check permissions: Admin or Project Leader
    const canUpdate =
      req.user.globalRole === GlobalRole.ADMIN ||
      project.leaderId.toString() === req.user._id.toString();

    if (!canUpdate) {
      res
        .status(403)
        .json({ message: "Access denied to update this project." });
      return;
    }

    // ✅ Store current/new leader ID
    const currentLeaderId = leaderId || project.leaderId;

    // Update members array if provided
    if (members !== undefined) {
      const uniqueUserIds = new Set<string>();
      const validatedMembers: IProjectMember[] = [];

      // Validate all members
      for (const member of members) {
        if (uniqueUserIds.has(member.userId.toString())) {
          res.status(400).json({
            message: `Duplicate user ${member.userId} in members array.`,
          });
          return; // ✅ ADDED RETURN
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

      // ✅ MOVED OUTSIDE LOOP: Auto-add leader if missing
      const leaderInMembers = validatedMembers.some(
        (member) => member.userId.toString() === currentLeaderId.toString()
      );

      if (!leaderInMembers) {
        validatedMembers.push({
          userId: currentLeaderId,
          projectRole: ProjectRole.LEADER,
        });
      }

      // Map to final member structure
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
          projectRole: member.projectRole || "Team Member",
          assignedAt: new Date(),
          assignedBy: req.user._id,
        };
      });

      // ✅ Final check leader is included
      const finalLeaderCheck = updatedMembers.some(
        (member) => member.userId.toString() === currentLeaderId.toString()
      );

      if (!finalLeaderCheck) {
        res.status(400).json({
          message: "Leader must be in members array.",
        });
        return;
      }

      // ✅ SINGLE ASSIGNMENT: Set project members
      project.members = updatedMembers;
    }

    // Update basic project fields
    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (startDate !== undefined) project.startDate = new Date(startDate);
    if (endDate !== undefined) project.endDate = new Date(endDate);
    if (status !== undefined) project.status = status;

    // Leader update validation
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

      // Update leader ID
      project.leaderId = leaderId;

      // Update leader role in members array if present
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

    // Only admin can delete projects
    if (req.user.globalRole !== GlobalRole.ADMIN) {
      res.status(403).json({ message: "Only admin can delete projects." });
      return;
    }

    // Soft delete
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

    // Only admin can restore projects
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
