import type { ReactNode, ElementType } from 'react';

interface RTLWrapperProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}

/**
 * Wrapper component that ensures RTL direction
 * Use when content needs explicit RTL regardless of parent
 */
export function RTLWrapper({ children, className = '', as = 'div' }: RTLWrapperProps) {
  const Component = as;
  return (
    <Component dir="rtl" className={`text-right ${className}`}>
      {children}
    </Component>
  );
}

/**
 * Error message component with RTL support
 */
export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div dir="rtl" className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

/**
 * Empty state component
 */
export function EmptyState({ 
  icon: Icon, 
  title, 
  description,
  action
}: { 
  icon: React.ComponentType<{ className?: string; size?: number }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div dir="rtl" className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      {description && <p className="text-muted-foreground mb-4">{description}</p>}
      {action}
    </div>
  );
}

/**
 * Loading spinner with optional text
 */
export function LoadingSpinner({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      {text && <p className="text-muted-foreground">{text}</p>}
    </div>
  );
}
