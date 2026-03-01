/**
 * CourseCard Organism Component
 * 
 * A card component for displaying courses with image/icon, title, description, metadata, status, and actions.
 * Uses Card, Menu, ProgressCard molecules and Typography, Badge, Icon, Avatar, ProgressBar, Button atoms.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { MoreVertical, Globe, Lock } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Menu, MenuItem } from '../../molecules/Menu';
import { ProgressCard } from '../../molecules/ProgressCard';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Icon } from '../../atoms/Icon';
import { Avatar } from '../../atoms/Avatar';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Button } from '../../atoms/Button';
import { cn } from '../../../utils/theme';

export interface CourseCardProps {
  /**
   * Course ID
   */
  id: string;
  
  /**
   * Course title
   */
  title: string;
  
  /**
   * Course description
   */
  description?: string;
  
  /**
   * Course image URL
   */
  imageUrl?: string;
  
  /**
   * Course icon
   */
  icon?: LucideIcon;
  
  /**
   * Course avatar/icon
   */
  avatar?: {
    src?: string;
    alt?: string;
    initials?: string;
  };
  
  /**
   * Number of modules
   */
  modules?: number;
  
  /**
   * Course duration (in hours)
   */
  duration?: number;
  
  /**
   * Completion progress (0-100)
   */
  progress?: number;
  
  /**
   * Is public course
   * @default false
   */
  isPublic?: boolean;
  
  /**
   * Course status
   */
  status?: 'draft' | 'published' | 'archived';
  
  /**
   * On course click
   */
  onClick?: () => void;
  
  /**
   * Course actions menu items
   */
  actions?: MenuItem[];
  
  /**
   * Quick action buttons
   */
  quickActions?: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  id,
  title,
  description,
  imageUrl,
  icon,
  avatar,
  modules,
  duration,
  progress,
  isPublic = false,
  status,
  onClick,
  actions,
  quickActions,
  className,
}) => {
  return (
    <Card
      variant="interactive"
      onClick={onClick}
      className={cn('overflow-hidden', className)}
    >
      {/* Image/Icon Header */}
      {imageUrl && (
        <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 mb-4">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {!imageUrl && (icon || avatar) && (
        <div className="flex items-center justify-center h-32 bg-indigo-100 dark:bg-indigo-900/30 mb-4">
          {avatar ? (
            <Avatar
              src={avatar.src}
              alt={avatar.alt}
              initials={avatar.initials}
              size="xl"
            />
          ) : icon ? (
            <Icon icon={icon} size="xl" className="text-indigo-600 dark:text-indigo-400" />
          ) : null}
        </div>
      )}

      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Typography variant="h6" className="truncate">
                {title}
              </Typography>
              {isPublic && (
                <Icon icon={Globe} size="sm" className="text-gray-400" />
              )}
              {!isPublic && (
                <Icon icon={Lock} size="sm" className="text-gray-400" />
              )}
            </div>
            {description && (
              <Typography variant="small" color="secondary" className="line-clamp-2">
                {description}
              </Typography>
            )}
          </div>

          {actions && actions.length > 0 && (
            <Menu
              trigger={
                <Button variant="ghost" size="sm" icon={MoreVertical}>Actions</Button>
              }
              items={actions}
              position="bottom-right"
            />
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2">
          {modules !== undefined && (
            <Badge variant="default" size="sm">
              {modules} modules
            </Badge>
          )}
          {duration !== undefined && (
            <Badge variant="default" size="sm">
              {duration}h
            </Badge>
          )}
          {status && (
            <Badge
              variant={
                status === 'published' ? 'success' :
                status === 'draft' ? 'warning' : 'default'
              }
              size="sm"
            >
              {status}
            </Badge>
          )}
        </div>

        {/* Progress */}
        {progress !== undefined && (
          <div>
            <ProgressBar value={progress} color="primary" />
            <Typography variant="small" color="secondary" className="mt-1">
              {progress}% complete
            </Typography>
          </div>
        )}

        {/* Quick Actions */}
        {quickActions && (
          <div className="pt-2">
            {quickActions}
          </div>
        )}
      </div>
    </Card>
  );
};

CourseCard.displayName = 'CourseCard';
