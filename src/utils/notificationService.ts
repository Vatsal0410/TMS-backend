import mongoose from "mongoose";
import { Notification } from "../models/Notification";
import { NotificationType, NotificationPriority } from "../types/enums";
import { Server as SocketIOServer } from "socket.io";

// Types
interface CreateNotificationParams {
  userId: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  relatedId?: {
    id: mongoose.Types.ObjectId;
    model: 'Task' | 'Project' | 'Worklog' | 'User';
  };
  metadata?: Record<string, any>;
  createdBy?: string | mongoose.Types.ObjectId;
  sendSocketNotification?: boolean;
}

interface SendNotificationParams extends CreateNotificationParams {
  io?: SocketIOServer;
}

// Create notification in database
export const createNotification = async ({
  userId,
  type,
  title,
  message,
  priority = NotificationPriority.MEDIUM,
  relatedId,
  metadata = {},
  createdBy,
  sendSocketNotification = true
}: CreateNotificationParams): Promise<any> => {
  try {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      priority,
      relatedId,
      metadata,
      createdBy,
      read: false,
    });

    await notification.save();
    
    // Populate for response
    const populatedNotification = await Notification.findById(notification._id)
      .populate('userId', 'fname lname email avatar')
      .populate('createdBy', 'fname lname email avatar');

    if (sendSocketNotification) {
      return {
        notification: populatedNotification,
        socketData: {
          userId: userId.toString(),
          notification: populatedNotification
        }
      };
    }

    return { notification: populatedNotification };
  } catch (error) {
    console.error("Create notification error:", error);
    throw new Error("Failed to create notification");
  }
};

// Send real-time notification via Socket.IO
export const sendRealTimeNotification = async (
  io: SocketIOServer,
  userId: string,
  notificationData: any
): Promise<void> => {
  try {
    // Emit to user's personal room
    io.to(`user-${userId}`).emit('notification:new', notificationData);
    
    // Also emit to user's unread count update
    const unreadCount = await Notification.countDocuments({
      userId,
      read: false,
      isDeleted: false
    });
    
    io.to(`user-${userId}`).emit('notification:unread-count', unreadCount);
    
    console.log(`📬 Real-time notification sent to user ${userId}`);
  } catch (error) {
    console.error("Send real-time notification error:", error);
  }
};

// Create AND send notification (combined function)
export const sendNotification = async ({
  io,
  userId,
  type,
  title,
  message,
  priority = NotificationPriority.MEDIUM,
  relatedId,
  metadata = {},
  createdBy
}: SendNotificationParams): Promise<any> => {
  try {
    // Create in database
    const result = await createNotification({
      userId,
      type,
      title,
      message,
      priority,
      relatedId,
      metadata,
      createdBy,
      sendSocketNotification: true
    });

    // Send real-time notification if io is provided
    if (io && result.socketData) {
      await sendRealTimeNotification(io, userId.toString(), result.socketData.notification);
    }

    return result.notification;
  } catch (error) {
    console.error("Send notification error:", error);
    throw error;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
): Promise<any> => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        userId,
        read: false,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      },
      { new: true }
    ).populate('userId createdBy');

    return notification;
  } catch (error) {
    console.error("Mark notification as read error:", error);
    throw error;
  }
};

// Get user notifications
export const getUserNotifications = async (
  userId: string,
  options: {
    page?: number;
    limit?: number;
    read?: boolean;
    type?: NotificationType;
  } = {}
): Promise<{ notifications: any[]; total: number; unreadCount: number }> => {
  try {
    const {
      page = 1,
      limit = 20,
      read,
      type
    } = options;

    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {
      userId,
      isDeleted: false
    };
    
    if (read !== undefined) {
      query.read = read;
    }
    
    if (type) {
      query.type = type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fname lname email avatar')
        .populate('createdBy', 'fname lname email avatar'),
      
      Notification.countDocuments(query),
      
      Notification.countDocuments({
        userId,
        read: false,
        isDeleted: false
      })
    ]);

    return {
      notifications,
      total,
      unreadCount
    };
  } catch (error) {
    console.error("Get user notifications error:", error);
    throw error;
  }
};

// Delete notification (soft delete)
export const deleteNotification = async (
  notificationId: string,
  userId: string
): Promise<boolean> => {
  try {
    const result = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        userId,
        isDeleted: false
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date()
        }
      }
    );

    return !!result;
  } catch (error) {
    console.error("Delete notification error:", error);
    throw error;
  }
};

// Bulk create notifications (for multiple users)
export const bulkCreateNotifications = async (
  users: Array<string | mongoose.Types.ObjectId>,
  notificationData: Omit<CreateNotificationParams, 'userId'>
): Promise<void> => {
  try {
    const notifications = users.map(userId => ({
      userId,
      ...notificationData,
      read: false
    }));

    await Notification.insertMany(notifications);
    console.log(`📨 Created ${notifications.length} notifications`);
  } catch (error) {
    console.error("Bulk create notifications error:", error);
    throw error;
  }
};

// Get notification by ID
export const getNotificationById = async (
  notificationId: string,
  userId: string
): Promise<any> => {
  try {
    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
      isDeleted: false
    })
    .populate('userId', 'fname lname email avatar')
    .populate('createdBy', 'fname lname email avatar');

    return notification;
  } catch (error) {
    console.error("Get notification by ID error:", error);
    throw error;
  }
};