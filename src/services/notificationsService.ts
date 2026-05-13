import apiClient from './apiClient';
import { ENDPOINTS } from '@/constants/endpoints';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type NotificationFilterType = 'ALL' | 'VISIT' | 'ORDER' | 'TARGET';

export interface Notification {
  id: number;
  userId: number;
  type: 'VISIT' | 'ORDER' | 'TARGET';
  title: string;
  description: string;
  timestamp: string; // ISO 8601
  isRead: boolean;
  metaData: Record<string, any> | null;
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface NotificationsListResult {
  notifications: Notification[];
  unreadCount: number;
  pagination: NotificationPagination;
}

// ─── API calls ─────────────────────────────────────────────────────────────────

export const fetchNotifications = async (
  type: NotificationFilterType = 'ALL',
  page = 1,
  limit = 20,
): Promise<NotificationsListResult> => {
  const response = await apiClient.get(ENDPOINTS.notifications.list, {
    params: { type, page, limit },
  });
  return response.data as NotificationsListResult;
};

export const markNotificationRead = async (id: number): Promise<Notification> => {
  const response = await apiClient.patch(ENDPOINTS.notifications.markRead(id));
  return response.data as Notification;
};

export const markAllNotificationsRead = async (): Promise<{ success: boolean; unreadCount: number }> => {
  const response = await apiClient.patch(ENDPOINTS.notifications.markAllRead);
  return response.data;
};
