/**
 * StudentProgressCard Organism Component
 * 
 * A card showing individual student progress in a course.
 * Displays avatar, name, progress bar, and activity metrics.
 */

import React from 'react';
import { 
  Clock, 
  Calendar, 
  BookOpen, 
  Award,
  TrendingUp,
  MoreVertical,
  Mail,
  Eye,
} from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Typography } from '../../atoms/Typography';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Avatar } from '../../atoms/Avatar';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Menu } from '../../molecules/Menu';
import { cn } from '../../../utils/theme';

export interface StudentProgressCardProps {
  /**
   * Student ID
   */
  id: string;
  
  /**
   * Student name
   */
  name: string;
  
  /**
   * Student email
   */
  email?: string;
  
  /**
   * Student avatar URL
   */
  avatarUrl?: string;
  
  /**
   * Course progress (0-100)
   */
  progress: number;
  
  /**
   * Lessons completed
   */
  lessonsCompleted: number;
  
  /**
   * Total lessons
   */
  totalLessons: number;
  
  /**
   * Last activity date
   */
  lastActivity?: Date | string;
  
  /**
   * Enrollment date
   */
  enrolledAt?: Date | string;
  
  /**
   * Time spent (in minutes)
   */
  timeSpent?: number;
  
  /**
   * Average quiz score (0-100)
   */
  avgQuizScore?: number;
  
  /**
   * Whether student has completed the course
   */
  isCompleted?: boolean;
  
  /**
   * Whether certificate was issued
   */
  hasCertificate?: boolean;
  
  /**
   * Layout variant
   * @default 'default'
   */
  variant?: 'default' | 'compact' | 'detailed';
  
  /**
   * On view student details
   */
  onViewDetails?: () => void;
  
  /**
   * On send message
   */
  onSendMessage?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTimeSpent = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatRelativeDate = (date: Date | string | undefined): string => {
  if (!date) return 'Never';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(d);
};

export const StudentProgressCard: React.FC<StudentProgressCardProps> = ({
  id,
  name,
  email,
  avatarUrl,
  progress,
  lessonsCompleted,
  totalLessons,
  lastActivity,
  enrolledAt,
  timeSpent,
  avgQuizScore,
  isCompleted = false,
  hasCertificate = false,
  variant = 'default',
  onViewDetails,
  onSendMessage,
  className,
}) => {
  const menuItems = [
    ...(onViewDetails ? [{
      id: 'view',
      label: 'View Details',
      icon: Eye,
      onClick: onViewDetails,
    }] : []),
    ...(onSendMessage ? [{
      id: 'message',
      label: 'Send Message',
      icon: Mail,
      onClick: onSendMessage,
    }] : []),
  ];
  
  if (variant === 'compact') {
    return (
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
        className
      )}>
        <Avatar 
          src={avatarUrl} 
          alt={name} 
          initials={name.substring(0, 2)} 
          size="sm" 
        />
        <div className="flex-1 min-w-0">
          <Typography variant="small" weight="medium" className="truncate">
            {name}
          </Typography>
          <div className="flex items-center gap-2">
            <ProgressBar value={progress} size="sm" className="flex-1" />
            <Typography variant="small" color="secondary">
              {progress}%
            </Typography>
          </div>
        </div>
        {isCompleted && (
          <Badge variant="success" size="sm">Done</Badge>
        )}
      </div>
    );
  }
  
  if (variant === 'detailed') {
    return (
      <Card className={cn('', className)}>
        <div className="flex items-start gap-4">
          <Avatar 
            src={avatarUrl} 
            alt={name} 
            initials={name.substring(0, 2)} 
            size="lg" 
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <Typography variant="h6">{name}</Typography>
                  {isCompleted && <Badge variant="success" size="sm">Completed</Badge>}
                  {hasCertificate && <Badge variant="info" size="sm">Certified</Badge>}
                </div>
                {email && (
                  <Typography variant="small" color="secondary">{email}</Typography>
                )}
              </div>
              
              {menuItems.length > 0 && (
                <Menu
                  trigger={
                    <Button variant="ghost" size="sm">
                      <Icon icon={MoreVertical} size="sm" />
                    </Button>
                  }
                  items={menuItems}
                  position="bottom-right"
                />
              )}
            </div>
            
            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <Typography variant="small" color="secondary">
                  Progress: {lessonsCompleted}/{totalLessons} lessons
                </Typography>
                <Typography variant="small" weight="semibold">
                  {progress}%
                </Typography>
              </div>
              <ProgressBar 
                value={progress} 
                color={isCompleted ? 'success' : 'primary'}
              />
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <Icon icon={Calendar} size="sm" className="text-gray-400" />
                <div>
                  <Typography variant="small" color="secondary">Enrolled</Typography>
                  <Typography variant="small" weight="medium">
                    {formatDate(enrolledAt)}
                  </Typography>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Icon icon={Clock} size="sm" className="text-gray-400" />
                <div>
                  <Typography variant="small" color="secondary">Last Active</Typography>
                  <Typography variant="small" weight="medium">
                    {formatRelativeDate(lastActivity)}
                  </Typography>
                </div>
              </div>
              
              {timeSpent !== undefined && (
                <div className="flex items-center gap-2">
                  <Icon icon={BookOpen} size="sm" className="text-gray-400" />
                  <div>
                    <Typography variant="small" color="secondary">Time Spent</Typography>
                    <Typography variant="small" weight="medium">
                      {formatTimeSpent(timeSpent)}
                    </Typography>
                  </div>
                </div>
              )}
              
              {avgQuizScore !== undefined && (
                <div className="flex items-center gap-2">
                  <Icon icon={TrendingUp} size="sm" className="text-gray-400" />
                  <div>
                    <Typography variant="small" color="secondary">Quiz Avg</Typography>
                    <Typography variant="small" weight="medium">
                      {avgQuizScore}%
                    </Typography>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }
  
  // Default variant
  return (
    <Card className={cn('', className)}>
      <div className="flex items-center gap-4">
        <Avatar 
          src={avatarUrl} 
          alt={name} 
          initials={name.substring(0, 2)} 
          size="md" 
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Typography variant="body" weight="medium" className="truncate">
              {name}
            </Typography>
            {isCompleted && <Badge variant="success" size="sm">Completed</Badge>}
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <ProgressBar value={progress} size="sm" className="flex-1" />
            <Typography variant="small" color="secondary" className="w-12 text-right">
              {progress}%
            </Typography>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Icon icon={BookOpen} size="xs" />
              {lessonsCompleted}/{totalLessons}
            </span>
            <span className="flex items-center gap-1">
              <Icon icon={Clock} size="xs" />
              {formatRelativeDate(lastActivity)}
            </span>
            {hasCertificate && (
              <span className="flex items-center gap-1 text-orange-500">
                <Icon icon={Award} size="xs" />
                Certified
              </span>
            )}
          </div>
        </div>
        
        {menuItems.length > 0 && (
          <Menu
            trigger={
              <Button variant="ghost" size="sm">
                <Icon icon={MoreVertical} size="sm" />
              </Button>
            }
            items={menuItems}
            position="bottom-right"
          />
        )}
      </div>
    </Card>
  );
};

StudentProgressCard.displayName = 'StudentProgressCard';





