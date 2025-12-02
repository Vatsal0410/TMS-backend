import mongoose, { Document, Schema } from "mongoose";
import { NotificationType, NotificationPriority } from "../types/enums";

// Notification interface
export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  readAt?: Date;
  relatedId?: {
    id: mongoose.Types.ObjectId;
    model: 'Task' | 'Project' | 'Worklog' | 'User';
  };
  metadata?: Record<string, any>;
  createdBy?: mongoose.Types.ObjectId;
  expiresAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

// Notification schema
const NotificationSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.MEDIUM,
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,
    relatedId: {
      id: {
        type: Schema.Types.ObjectId,
        index: true,
      },
      model: {
        type: String,
        enum: ["Task", "Project", "Worklog", "User"],
      },
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      index: { expires: 0 }, // TTL index
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound indexes
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

// Notification model
export const Notification = mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);