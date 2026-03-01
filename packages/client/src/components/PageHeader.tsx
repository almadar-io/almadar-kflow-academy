import React, { forwardRef } from 'react';

interface PageHeaderProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  gradientClassName?: string;
}

const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(
  ({
    children,
    className = '',
    containerClassName = '',
    gradientClassName = 'bg-gradient-to-r from-indigo-600 to-purple-600',
  }, ref) => {
    return (
      <header ref={ref} className={`${gradientClassName} text-white shadow-lg overflow-x-hidden ${className}`}>
        <div className={`max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 ${containerClassName}`}>{children}</div>
      </header>
    );
  },
);

PageHeader.displayName = 'PageHeader';

export default PageHeader;

