'use client';

import { cn } from '@/lib/utils';
import { FadeIn, ScaleHover } from '@/components/ui/motion';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  change?: number;
  changeLabel?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  delay?: number;
  className?: string;
}

const variantStyles = {
  default: {
    bg: 'bg-card',
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
  },
  primary: {
    bg: 'bg-card',
    iconBg: 'bg-blue-100 dark:bg-blue-950',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  success: {
    bg: 'bg-card',
    iconBg: 'bg-green-100 dark:bg-green-950',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  warning: {
    bg: 'bg-card',
    iconBg: 'bg-amber-100 dark:bg-amber-950',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  danger: {
    bg: 'bg-card',
    iconBg: 'bg-red-100 dark:bg-red-950',
    iconColor: 'text-red-600 dark:text-red-400',
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  variant = 'default',
  delay = 0,
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <FadeIn delay={delay}>
      <ScaleHover>
        <div
          className={cn(
            'rounded-2xl border p-6 transition-shadow hover:shadow-lg',
            styles.bg,
            className
          )}
        >
          <div className="flex items-start justify-between">
            {/* Icon */}
            <div className={cn('p-3 rounded-xl', styles.iconBg)}>
              <Icon size={24} className={styles.iconColor} />
            </div>

            {/* Change indicator */}
            {change !== undefined && (
              <div
                className={cn(
                  'flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full',
                  isPositive && 'text-green-600 bg-green-100 dark:bg-green-950',
                  isNegative && 'text-red-600 bg-red-100 dark:bg-red-950',
                  !isPositive && !isNegative && 'text-muted-foreground bg-muted'
                )}
              >
                {isPositive && <TrendingUp size={14} />}
                {isNegative && <TrendingDown size={14} />}
                {!isPositive && !isNegative && <Minus size={14} />}
                <span>{Math.abs(change)}%</span>
              </div>
            )}
          </div>

          {/* Value */}
          <div className="mt-4">
            <p className="text-3xl font-bold text-foreground">
              {typeof value === 'number' ? value.toLocaleString('ar-EG') : value}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{title}</p>
          </div>

          {/* Change label */}
          {changeLabel && (
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
              {changeLabel}
            </p>
          )}
        </div>
      </ScaleHover>
    </FadeIn>
  );
}

// Quick stats row component
interface QuickStatsProps {
  stats: {
    title: string;
    value: number | string;
    icon: LucideIcon;
    variant?: StatCardProps['variant'];
    change?: number;
  }[];
  className?: string;
}

export function QuickStats({ stats, className }: QuickStatsProps) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {stats.map((stat, index) => (
        <StatCard
          key={stat.title}
          {...stat}
          delay={index * 0.1}
        />
      ))}
    </div>
  );
}
