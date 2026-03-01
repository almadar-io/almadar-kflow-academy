/**
 * NotificationCenterTemplate Component
 * 
 * Notification center and activity feed.
 * Uses AppLayoutTemplate for consistent layout structure.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Settings, 
  BookOpen,
  Award,
  MessageSquare,
  AlertCircle,
  Info
} from 'lucide-react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { Card } from '../../molecules/Card';
import { Tabs, TabItem } from '../../molecules/Tabs';
import { EmptyState } from '../../molecules/EmptyState';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Avatar } from '../../atoms/Avatar';
import { cn } from '../../../utils/theme';

export type NotificationType = 'course' | 'achievement' | 'comment' | 'alert' | 'info';

export interface Notification {
  /**
   * Notification ID
   */
  id: string;
  
  /**
   * Notification type
   */
  type: NotificationType;
  
  /**
   * Notification title
   */
  title: string;
  
  /**
   * Notification message
   */
  message: string;
  
  /**
   * Timestamp
   */
  timestamp: string;
  
  /**
   * Is read
   */
  isRead: boolean;
  
  /**
   * Action URL
   */
  actionUrl?: string;
  
  /**
   * Actor (e.g., user who commented)
   */
  actor?: {
    name: string;
    avatar?: string;
  };
}

export interface NotificationCenterTemplateProps {
  /**
   * Notifications
   */
  notifications: Notification[];
  
  /**
   * Unread count
   */
  unreadCount?: number;
  
  /**
   * On notification click
   */
  onNotificationClick?: (notification: Notification) => void;
  
  /**
   * On mark as read
   */
  onMarkAsRead?: (notificationId: string) => void;
  
  /**
   * On mark all as read
   */
  onMarkAllAsRead?: () => void;
  
  /**
   * On delete notification
   */
  onDelete?: (notificationId: string) => void;
  
  /**
   * On clear all
   */
  onClearAll?: () => void;
  
  /**
   * On settings click
   */
  onSettingsClick?: () => void;
  
  /**
   * Active filter
   */
  activeFilter?: 'all' | 'unread';
  
  /**
   * On filter change
   */
  onFilterChange?: (filter: 'all' | 'unread') => void;
  
  /**
   * User information for header
   */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };
  
  /**
   * Navigation items for sidebar
   */
  navigationItems?: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    active?: boolean;
  }>;
  
  /**
   * Logo element
   */
  logo?: React.ReactNode;
  
  /**
   * On logo click
   */
  onLogoClick?: () => void;
  
  /**
   * On logout handler
   */
  onLogout?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const NotificationCenterTemplate: React.FC<NotificationCenterTemplateProps> = ({
  notifications,
  unreadCount = 0,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
  onSettingsClick,
  activeFilter = 'all',
  onFilterChange,
  user,
  navigationItems = [],
  logo,
  onLogoClick,
  onLogout,
  className,
}) => {

  const tabs: TabItem[] = [
    { id: 'all', label: `All (${notifications.length})`, content: null },
    { id: 'unread', label: `Unread (${unreadCount})`, content: null },
  ];

  const filteredNotifications = activeFilter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'course': return BookOpen;
      case 'achievement': return Award;
      case 'comment': return MessageSquare;
      case 'alert': return AlertCircle;
      case 'info': return Info;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'course': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'achievement': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'comment': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'alert': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'info': return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const groupNotificationsByDate = (notifications: Notification[]) => {
    const groups: Record<string, Notification[]> = {};
    
    notifications.forEach(notification => {
      const date = new Date(notification.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });
    
    return groups;
  };

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={user}
      onLogout={onLogout}
      logo={logo}
      brandName="KFlow"
      onLogoClick={onLogoClick}
      className={className}
      contentClassName="max-w-3xl mx-auto"
    >
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              <Typography variant="h3" className="text-xl sm:text-2xl md:text-3xl">Notifications</Typography>
              {unreadCount > 0 && (
                <Badge variant="primary" className="text-xs sm:text-sm">{unreadCount} new</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={CheckCheck}
                  onClick={onMarkAllAsRead}
                  className="text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Mark all read</span>
                  <span className="sm:hidden">Mark all</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                icon={Settings}
                onClick={onSettingsClick}
              >
                <span className="sr-only">Settings</span>
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            items={tabs}
            activeTab={activeFilter}
            onTabChange={(id: string) => onFilterChange?.(id as 'all' | 'unread')}
            className="mb-6"
          />

          {/* Notifications list */}
          {filteredNotifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={activeFilter === 'unread' ? 'No unread notifications' : 'No notifications'}
              description={activeFilter === 'unread' ? "You're all caught up!" : 'You have no notifications yet.'}
            />
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {Object.entries(groupedNotifications).map(([date, notifications]) => (
                <div key={date}>
                  <Typography variant="small" color="muted" className="mb-2 sm:mb-3 text-xs sm:text-sm">
                    {date}
                  </Typography>
                  <div className="space-y-2 sm:space-y-3">
                    {notifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.type);
                      const colorClass = getNotificationColor(notification.type);
                      
                      return (
                        <Card
                          key={notification.id}
                          onClick={() => onNotificationClick?.(notification)}
                          className={cn(
                            'cursor-pointer',
                            !notification.isRead && 'border-l-4 border-l-indigo-600'
                          )}
                        >
                          <div className="flex items-start gap-4">
                            {/* Icon or Avatar */}
                            {notification.actor ? (
                              <Avatar
                                src={notification.actor.avatar}
                                initials={notification.actor.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                size="sm"
                              />
                            ) : (
                              <div className={cn('p-2 rounded-lg', colorClass)}>
                                <Icon className="w-4 h-4" />
                              </div>
                            )}
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <Typography
                                    variant="body"
                                    weight={notification.isRead ? 'normal' : 'semibold'}
                                  >
                                    {notification.title}
                                  </Typography>
                                  <Typography variant="small" color="secondary" className="mt-0.5">
                                    {notification.message}
                                  </Typography>
                                </div>
                                
                                {/* Actions */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {!notification.isRead && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      icon={Check}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onMarkAsRead?.(notification.id);
                                      }}
                                      title="Mark as read"
                                    >
                                      <span className="sr-only">Mark as read</span>
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={Trash2}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDelete?.(notification.id);
                                    }}
                                    title="Delete"
                                  >
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </div>
                              </div>
                              
                              <Typography variant="small" color="muted" className="mt-2">
                                {notification.timestamp}
                              </Typography>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Clear all button */}
              {notifications.length > 0 && (
                <div className="text-center pt-4">
                  <Button
                    variant="ghost"
                    onClick={onClearAll}
                  >
                    Clear all notifications
                  </Button>
                </div>
              )}
            </div>
          )}
    </AppLayoutTemplate>
  );
};

NotificationCenterTemplate.displayName = 'NotificationCenterTemplate';

