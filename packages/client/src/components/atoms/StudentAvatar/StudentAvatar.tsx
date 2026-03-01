/**
 * StudentAvatar Atom Component
 * 
 * Avatar component specifically for students with initials fallback.
 * Extends the base Avatar component with student-specific features.
 */

import React from 'react';
import { Avatar, AvatarProps } from '../Avatar';

export interface StudentAvatarProps extends Omit<AvatarProps, 'initials'> {
  /**
   * Student name (used to generate initials)
   */
  studentName?: string;
  
  /**
   * Student email (used as alt text)
   */
  studentEmail?: string;
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  studentName,
  studentEmail,
  src,
  alt,
  ...avatarProps
}) => {
  // Generate initials from student name
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const initials = studentName ? getInitials(studentName) : undefined;
  const altText = alt || studentName || studentEmail || 'Student avatar';

  return (
    <Avatar
      {...avatarProps}
      src={src}
      alt={altText}
      initials={initials}
    />
  );
};

StudentAvatar.displayName = 'StudentAvatar';
