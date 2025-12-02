import mongoose, { Document, Schema } from "mongoose";

// Worklog interface
export interface IWorklog extends Document {
    taskId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    date: Date;
    hours: number;
    description?: string;
    isOvertime: boolean;
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// Worklog schema 
const WorklogSchema: Schema = new Schema({
    taskId: {
        type: Schema.Types.ObjectId,
        ref: 'Task',
        required: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    hours: {
        type: Number,
        required: true,
        min: 0.25,
        max: 24
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 500
    },
    isOvertime: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    deletedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }
}, {
    timestamps: true,
    versionKey: false
})

// Indexes for faster queries
WorklogSchema.index({ taskId: 1, date: 1})
WorklogSchema.index({ userId: 1, date: 1})
WorklogSchema.index({ taskId: 1, userId: 1})
WorklogSchema.index({ date: 1, isDeleted: 1})

// Worklog model
export const Worklog = mongoose.model<IWorklog>("Worklog", WorklogSchema)
