import React from 'react';
import PropTypes from 'prop-types';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

/**
 * Reusable Alert Component
 * Used for displaying messages, notifications, and feedback
 */
const Alert = ({
  children,
  variant = 'info',
  title,
  onClose,
  className = '',
  ...props
}) => {
  const baseClasses = 'rounded-xl border p-4 relative';

  const variantConfig = {
    info: {
      classes: 'bg-blue-600/10 border-blue-600/20 text-blue-600',
      icon: Info,
      iconColor: 'text-blue-600',
      textColor: 'text-blue-200',
    },
    success: {
      classes: 'bg-green-600/10 border-green-600/20 text-green-600',
      icon: CheckCircle,
      iconColor: 'text-green-600',
      textColor: 'text-green-200',
    },
    warning: {
      classes: 'bg-yellow-600/10 border-yellow-600/20 text-yellow-600',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600',
      textColor: 'text-yellow-200',
    },
    danger: {
      classes: 'bg-red-600/10 border-red-600/20 text-red-600',
      icon: AlertCircle,
      iconColor: 'text-red-600',
      textColor: 'text-red-200',
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  const classes = `
    ${baseClasses}
    ${config.classes}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={classes} {...props}>
      <div className="flex items-start space-x-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
        <div className="flex-1">
          {title && (
            <h4 className={`font-semibold mb-1 ${config.iconColor}`}>{title}</h4>
          )}
          <div className={`text-sm ${config.textColor}`}>{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`flex-shrink-0 ${config.iconColor} hover:opacity-70 transition-opacity`}
            aria-label="Close alert"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

Alert.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['info', 'success', 'warning', 'danger']),
  title: PropTypes.string,
  onClose: PropTypes.func,
  className: PropTypes.string,
};

export default Alert;
