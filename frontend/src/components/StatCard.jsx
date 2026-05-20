import React from 'react';
import PropTypes from 'prop-types';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Reusable Stat Card Component
 * Used for displaying statistics, metrics, and KPIs
 */
const StatCard = ({
  title,
  value,
  icon: Icon,
  change,
  changeType,
  description,
  variant = 'default',
  className = '',
  ...props
}) => {
  const baseClasses = 'rounded-2xl border p-6 transition-all duration-300';

  const variantClasses = {
    default: 'bg-dark-900/50 backdrop-blur-sm border-dark-800 hover:border-dark-700',
    gradient: 'bg-dark-900/60 backdrop-blur-sm border-dark-800 hover:border-primary-600/30',
    primary: 'bg-primary-600/10 border-primary-600/20 hover:border-primary-600/40',
  };

  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const isPositive = changeType === 'increase';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? 'text-green-500' : 'text-red-500';

  return (
    <div className={classes} {...props}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-dark-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-white">{value}</h3>
        </div>
        {Icon && (
          <div className="w-12 h-12 bg-primary-600/10 rounded-xl flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary-600" />
          </div>
        )}
      </div>

      {(change || description) && (
        <div className="flex items-center justify-between">
          {change && (
            <div className={`flex items-center space-x-1 text-sm font-medium ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span>{change}</span>
            </div>
          )}
          {description && (
            <p className="text-dark-500 text-xs">{description}</p>
          )}
        </div>
      )}
    </div>
  );
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.elementType,
  change: PropTypes.string,
  changeType: PropTypes.oneOf(['increase', 'decrease']),
  description: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'gradient', 'primary']),
  className: PropTypes.string,
};

export default StatCard;
