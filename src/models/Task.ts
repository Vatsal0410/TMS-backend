import mongoose, { Document, Schema } from "mongoose";
import { TaskPriority, TaskStatus } from "../types/enums";

// Task interface
export interface ITask extends Document {
  taskNumber: string;
  title: string;
  description?: string;
  projectId: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId;
  parentTaskId?: mongoose.Types.ObjectId;
  status: TaskStatus;
  priority: TaskPriority;
  estimatedHours?: number;
  actualHours?: number;
  startDate?: Date;
  endDate?: Date;
  completedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
}

// Task schema
const TaskSchema: Schema = new Schema(
  {
    taskNumber: {
      type: String,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    parentTaskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.PENDING,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.LOW,
      index: true,
    },
    estimatedHours: Number,
    actualHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: Date,
    endDate: Date,
    completedAt: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for faster queries
TaskSchema.index({ projectId: 1, taskNumber: 1 });
TaskSchema.index({ projectId: 1, status: 1 });
TaskSchema.index({ projectId: 1, assignedTo: 1 });
TaskSchema.index({ parentTaskId: 1, isDeleted: 1 });

// Task model 
export const Task = mongoose.model<ITask>("Task", TaskSchema)