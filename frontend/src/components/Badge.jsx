import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable Badge Component
 * Used for status indicators, labels, and tags
 */
const Badge = ({
  children,
  variant = 'default',
  size = 'default',
  icon: Icon,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full transition-colors';

  const variantClasses = {
    default: 'bg-dark-800 text-dark-300 border border-dark-700',
    primary: 'bg-primary-600/10 text-primary-600 border border-primary-600/20',
    success: 'bg-green-600/10 text-green-600 border border-green-600/20',
    warning: 'bg-yellow-600/10 text-yellow-600 border border-yellow-600/20',
    danger: 'bg-red-600/10 text-red-600 border border-red-600/20',
    info: 'bg-blue-600/10 text-blue-600 border border-blue-600/20',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    default: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <span className={classes} {...props}>
      {Icon && <Icon className="w-4 h-4 mr-1.5" />}
      {children}
    </span>
  );
};

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'primary', 'success', 'warning', 'danger', 'info']),
  size: PropTypes.oneOf(['sm', 'default', 'lg']),
  icon: PropTypes.elementType,
  className: PropTypes.string,
};

export default Badge;
