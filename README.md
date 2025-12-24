# Task Management System Backend API

This document describes all available HTTP routes in the backend service, their authentication requirements, expected inputs, and typical responses.

## Base URL

- API URL: `https://tms-backend-rhbu.onrender.com/api`

## Authentication

- Header: `Authorization: Bearer <accessToken>` (short-lived, 15 minutes)
- Refresh: `refreshToken` (long-lived, 7 days)
- Some modules apply `checkTempPassword` which blocks requests if a temporary password is still active (except for `set-new-password`).

## Health

- `GET /health`
  - Public liveness check
  - Response: `{ message: "Server is running!" }`

## Auth Routes (`/api/auth`)

| Method | Path                        | Auth            | Description |
|--------|-----------------------------|-----------------|-------------|
| POST   | `/api/auth/login`           | Public          | Authenticates and returns `accessToken`, `refreshToken`, and user profile.
| POST   | `/api/auth/refresh-token`   | Public          | Exchanges a valid refresh token for a new access token.
| POST   | `/api/auth/request-password-reset` | Public | Sends a password reset OTP to the user if account exists.
| POST   | `/api/auth/verify-password-reset`  | Public | Verifies the password reset OTP and marks it used.
| PUT    | `/api/auth/change-password` | Public          | Changes password after OTP verification.
| GET    | `/api/auth/me`              | Access + Temp check | Returns current authenticated user.
| PUT    | `/api/auth/set-new-password`| Access          | Sets new password when temporary password is active.
| POST   | `/api/auth/logout`          | Access          | Revokes current session (clears refresh token).
| GET    | `/api/auth/sessions`        | Access          | Returns simple session metadata for current user.
| POST   | `/api/auth/revoke-sessions` | Access          | Revokes all sessions for current user.

### Key Inputs and Responses

- Login body: `{ email: string, password: string }`
- Refresh body: `{ refreshToken: string }`
- Request OTP body: `{ email: string }`
- Verify OTP body: `{ email: string, otp: string }`
- Change password body: `{ email: string, otp: string, newPassword: string }`
- Set new password body: `{ newPassword: string }`

## User Routes (`/api/users`)

All user routes require admin access (`Authorization` header and role `admin`).

| Method | Path                          | Auth   | Description |
|--------|-------------------------------|--------|-------------|
| POST   | `/api/users/`                 | Admin  | Creates a user with a temporary password and emails a welcome message.
| GET    | `/api/users/`                 | Admin  | Lists users with pagination and optional `search`.
| GET    | `/api/users/:id`              | Admin  | Gets user by id.
| PUT    | `/api/users/:id`              | Admin  | Updates user fields (name, email, status, role).
| DELETE | `/api/users/:id`              | Admin  | Soft-deletes a user (prevents self-deletion).
| PUT    | `/api/users/:id/restore`      | Admin  | Restores a previously deleted user.
| PUT    | `/api/users/:id/status`       | Admin  | Toggles `isActive`; sends status change email.
| POST   | `/api/users/refresh-token`    | Admin  | Duplicate refresh endpoint under users.
| POST   | `/api/users/logout`           | Admin  | Duplicate logout endpoint under users.

### User Inputs

- Create body: `{ fname: string, lname?: string, email: string, globalRole: 'admin' | 'project_manager' | 'team_member' }`
- List query: `{ page?: number = 1, limit?: number = 20, search?: string }`
- Update body: any of `{ fname, lname, email, isActive, globalRole }`
- Status body: `{ isActive: boolean }`

## Project Routes (`/api/projects`)

All project routes require access (`Authorization` header). Some require admin.

| Method | Path                              | Auth                 | Description |
|--------|-----------------------------------|----------------------|-------------|
| GET    | `/api/projects/analytics/stats`   | Access               | Aggregated project stats (status, team size, timeline, counts). Access filtered by role.
| GET    | `/api/projects/`                  | Access               | Lists projects with filters and role-based visibility.
| GET    | `/api/projects/:id`               | Access               | Gets project by id if admin, leader, or member.
| POST   | `/api/projects/`                  | Admin                | Creates a project; validates leader role and member roles; emails assignments.
| PUT    | `/api/projects/:id`               | Access (admin or leader) | Updates project fields; ensures leader is present in members.
| DELETE | `/api/projects/:id`               | Admin                | Soft-deletes a project.
| PUT    | `/api/projects/:id/restore`       | Admin                | Restores a soft-deleted project.

### Project Inputs

- Create body: `{ title, description, startDate, endDate, leaderId, members: Array<{ userId, projectRole }> }`
- List query: `{ page?: number=1, limit?: number=20, search?, status?, startDateFrom?, startDateTo?, endDateFrom?, endDateTo? }`
- Update body: any of `{ title, description, startDate, endDate, status, leaderId, members }`

## Task Routes (`/api/tasks`)

All task routes require access. Creation and some updates require admin or project leader.

| Method | Path                                          | Auth                | Description |
|--------|-----------------------------------------------|---------------------|-------------|
| GET    | `/api/tasks/insights`                         | Access              | Aggregated task metrics (status distribution, accuracy, totals). Optional filter `projectId`.
| GET    | `/api/tasks/`                                 | Access              | Lists tasks with filters and role-based project access.
| GET    | `/api/tasks/:id`                              | Access              | Gets task by id (access controlled by role and project membership).
| POST   | `/api/tasks/`                                 | Access (admin/leader) | Creates a task; validates assigned member and parent task.
| PUT    | `/api/tasks/:id`                              | Access              | Updates a task; access rules enforced in handler.
| DELETE | `/api/tasks/:id`                              | Access              | Soft-deletes a task.
| PUT    | `/api/tasks/:id/restore`                      | Access              | Restores a soft-deleted task.
| GET    | `/api/tasks/:id/subtasks`                     | Access              | Lists subtasks of a task.
| GET    | `/api/tasks/:id/subTasks/:subTaskId`          | Access              | Gets a specific subtask by id.
| POST   | `/api/tasks/:id/subtasks`                     | Access              | Creates a subtask; validations similar to task creation.
| PUT    | `/api/tasks/:id/subtasks/:subTaskId`          | Access              | Updates a subtask.
| DELETE | `/api/tasks/:id/subtasks/:subTaskId`          | Access              | Soft-deletes a subtask.
| PUT    | `/api/tasks/:id/subtasks/:subTaskId/restore`  | Access              | Restores a soft-deleted subtask.

### Task Inputs

- Create body: `{ title, description?, projectId, assignedTo?, parentTaskId?, priority?, estimatedHours?, startDate?, endDate? }`
- List query: `{ projectId?, status?, assignedTo?, priority?, search?, page?: number=1, limit?: number=20 }`
- Update body: any updatable task fields (`title`, `description`, `status`, `priority`, `assignedTo`, `estimatedHours`, `startDate`, `endDate`)

## Worklog Routes (`/api/worklogs`)

All worklog routes require access. Owners, leaders, or admin can view/modify per rules.

| Method | Path                         | Auth   | Description |
|--------|------------------------------|--------|-------------|
| GET    | `/api/worklogs/insights`     | Access | Aggregated worklog summary by `groupBy` (`user` default, `task`, `project`, `date`). Role-based visibility.
| POST   | `/api/worklogs/`             | Access | Creates a worklog; enforces overtime and membership constraints.
| GET    | `/api/worklogs/`             | Access | Lists worklogs with filters; role-based constraints.
| GET    | `/api/worklogs/:id`          | Access | Gets a worklog by id; owner, leader, or admin.
| PUT    | `/api/worklogs/:id`          | Access | Updates worklog; adjusts task hours; recalculates overtime.
| DELETE | `/api/worklogs/:id`          | Access | Soft-deletes worklog; owners limited to 24h from creation unless admin/leader.
| PUT    | `/api/worklogs/:id/restore`  | Access | Restores a soft-deleted worklog.

### Worklog Inputs

- Create body: `{ taskId, date, hours (0.25–24), description }`
- List query: `{ taskId?, userId?, startDate?, endDate?, showOvertimeOnly?, page?: number=1, limit?: number=50 }`
- Update body: any of `{ date, hours, description }`

## Notes

- CORS: methods: `GET, POST, PUT, DELETE`.
- Role names: `admin`, `project_manager`, `team_member`.
- Soft-delete: Many resources use `isDeleted` with restore endpoints.
- Errors: Handlers return appropriate `400/401/403/404/500` with messages.

