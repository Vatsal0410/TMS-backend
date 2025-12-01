import mongoose, { Schema, Document } from "mongoose";
import { GlobalRole, ProjectRole } from "../types/enums";

export interface IOTPRequest {
  code: string; 
  purpose: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION';
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
  usedBy?: Schema.Types.ObjectId;
  createdAt: Date;
}

export interface IUser extends Document {
    fname: string;
    lname?: string;
    email: string;
    password: string;
    avatar?: string;
    globalRole: GlobalRole;
    projectAssignments: {
        projectId: Schema.Types.ObjectId;
        projectRole: ProjectRole;
        assignedAt: Date;
        assignedBy: Schema.Types.ObjectId;
    }[];
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: Schema.Types.ObjectId;
    createdBy: Schema.Types.ObjectId;
    updatedBy: Schema.Types.ObjectId;
    lastActive?: Date;
    
    lastPasswordChange?: Date;
    
    tempPassword?: string;
    isTempPasswordActive: boolean;
    
    otpRequests: IOTPRequest[]
    resetPasswordOTP?: string;
    resetPasswordOTPExpires?: Date;
}

const UserSchema: Schema = new Schema({
    fname: {
        type: String,
        required: true
    },
    lname: String,
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: { 
        type: String,
        required: true
    },
    avatar: String,
    globalRole: {
        type: String,
        enum: Object.values(GlobalRole),
        required: true
    },
    projectAssignments: [{
        projectId: {
            type: Schema.Types.ObjectId,
            ref: 'Project'
        },
        projectRole: {
            type: String,
            enum: Object.values(ProjectRole),
            required: true
        },
        assignedAt: {
            type: Date,
            default: Date.now
        },
        assignedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
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
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    lastActive: Date,
    
    
    lastPasswordChange: Date,
    
    
    tempPassword: String,
    isTempPasswordActive: {
        type: Boolean,
        default: false
    },
    otpRequests: [{
        code: {
            type: String,
            required: true
        },
        purpose: {
            type: String,
            enum: ['PASSWORD_RESET', 'EMAIL_VERIFICATION', 'PHONE_VERIFICATION'],
            required: true
        },
        expiresAt: {
            type: Date,
            required: true
        },
        used: {
            type: Boolean,
            default: false
        },
        usedAt: Date,
        usedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    resetPasswordOTP: String,
    resetPasswordOTPExpires: Date
}, {
    timestamps: true,
    versionKey: false
});

export const User = mongoose.model<IUser>('User', UserSchema);