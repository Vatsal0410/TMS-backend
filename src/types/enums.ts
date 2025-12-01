export enum GlobalRole {
  ADMIN = "admin",
  PROJECT_MANAGER = "project_manager",
  TEAM_MEMBER = "team_member",
}

export enum ProjectStatus {
  PLANNING = "planning",
  ACTIVE = "active",
  ON_HOLD = "on_hold",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum ProjectRole {
  LEADER = "leader",
  FRONTEND_DEVELOPER = "frontend_developer",
  BACKEND_DEVELOPER = "backend_developer",
  FULL_STACK_DEVELOPER = "fullstack_developer",
  UI_UX_DEVELOPER = "ui_ux_developer",
  QA_ENGINEER = "qa_engineer",
  DEVOPS_ENGINEER = "devops_engineer",
}

export enum TaskStatus {
  PENDING = "pending",
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  REVIEW = "review",
  DONE = "done",
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}
