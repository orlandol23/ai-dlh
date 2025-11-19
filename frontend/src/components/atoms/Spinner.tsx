import React from 'react';

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  size = 'md',
  className = '' 
}) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div 
      className={`${sizes[size]} border-current border-t-transparent rounded-full animate-spin ${className}`}
      style={{ 
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
};
