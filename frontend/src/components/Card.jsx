import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable Card Component
 * A flexible card component with variants, hover effects, and customizable styling
 */
const Card = ({
  children,
  variant = 'default',
  hover = false,
  padding = 'default',
  className = '',
  onClick,
  ...props
}) => {
  const baseClasses = 'rounded-2xl border transition-all duration-300';

  const variantClasses = {
    default: 'bg-dark-900/50 backdrop-blur-sm border-dark-800',
    gradient: 'bg-dark-900/60 backdrop-blur-sm border-dark-800',
    solid: 'bg-dark-900 border-dark-800',
    outline: 'bg-transparent border-dark-800',
    primary: 'bg-primary-600/10 border-primary-600/20',
  };

  const hoverClasses = hover
    ? 'hover:border-primary-600/50 hover:bg-dark-900/70 cursor-pointer hover:scale-[1.02]'
    : '';

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8',
    xl: 'p-12',
  };

  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${hoverClasses}
    ${paddingClasses[padding]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={classes} onClick={onClick} {...props}>
      {children}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'gradient', 'solid', 'outline', 'primary']),
  hover: PropTypes.bool,
  padding: PropTypes.oneOf(['none', 'sm', 'default', 'lg', 'xl']),
  className: PropTypes.string,
  onClick: PropTypes.func,
};

/**
 * Card Header Component
 */
export const CardHeader = ({ children, className = '' }) => (
  <div className={`mb-6 ${className}`}>{children}</div>
);

CardHeader.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * Card Title Component
 */
export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-xl font-bold text-white ${className}`}>{children}</h3>
);

CardTitle.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * Card Description Component
 */
export const CardDescription = ({ children, className = '' }) => (
  <p className={`text-dark-400 text-sm mt-2 ${className}`}>{children}</p>
);

CardDescription.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * Card Content Component
 */
export const CardContent = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

CardContent.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * Card Footer Component
 */
export const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-6 pt-6 border-t border-dark-800 ${className}`}>{children}</div>
);

CardFooter.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default Card;
