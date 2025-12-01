import mongoose, { Schema, Document } from "mongoose";
import { ProjectStatus } from "../types/enums";

export interface IProjectMember {
  userId: mongoose.Types.ObjectId;
  projectRole: string;
  assignedAt?: Date;
  assignedBy?: mongoose.Types.ObjectId;
}

export interface IProject extends Document {
  title: string;
  description: string;
  status: ProjectStatus;
  leaderId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  members: IProjectMember[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
}

const ProjectSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 500
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(ProjectStatus),
    default: ProjectStatus.PLANNING
  },
  leaderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true 
    },
    projectRole: {
      type: String,
      required: true,
      trim: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  versionKey: false
});

ProjectSchema.index({ leaderId: 1 });
ProjectSchema.index({ 'members.userId': 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ isDeleted: 1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);