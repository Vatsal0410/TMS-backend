import mongoose, { Schema, Document } from "mongoose";

// Session interface
export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  isValid: boolean;
  createdAt: Date;
}

// Session schema
const SessionSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  refreshToken: {
    type: String,
    required: true,
    unique: true
  },
  userAgent: String,
  ipAddress: String,
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  isValid: {
    type: Boolean,
    default: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index refreshToken and expiresAt
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Export Session model
export const Session = mongoose.model<ISession>("Session", SessionSchema);