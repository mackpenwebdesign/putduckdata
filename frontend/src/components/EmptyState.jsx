import React from 'react';
import PropTypes from 'prop-types';
import Button from './Button';

/**
 * Reusable Empty State Component
 * Used when there's no data to display
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
  ...props
}) => {
  return (
    <div className={`text-center py-12 ${className}`} {...props}>
      {Icon && (
        <div className="w-16 h-16 bg-dark-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Icon className="w-8 h-8 text-dark-500" />
        </div>
      )}
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-dark-400 mb-6 max-w-md mx-auto">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="lg">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

EmptyState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  className: PropTypes.string,
};

export default EmptyState;
