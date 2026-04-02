interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = 'md', className = '', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-10 w-10',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        className={`animate-spin text-primary ${sizeClasses[size]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {text && (
        <span className={`text-gray-500 ${textSizes[size]}`}>{text}</span>
      )}
    </div>
  );
}

// 进度条加载动画
interface ProgressLoaderProps {
  progress: number; // 0-100
  className?: string;
}

export function ProgressLoader({ progress, className = '' }: ProgressLoaderProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const filledBars = Math.floor(clampedProgress / 10);
  const emptyBars = 10 - filledBars;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* 进度条方块 */}
      <div className="flex">
        {Array.from({ length: filledBars }).map((_, i) => (
          <div
            key={`filled-${i}`}
            className="w-3 h-3 bg-primary rounded-sm animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
        {Array.from({ length: emptyBars }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-3 h-3 bg-gray-200 rounded-sm"
          />
        ))}
      </div>
      {/* 百分比 */}
      <span className="text-primary font-medium text-sm ml-2">
        {Math.round(clampedProgress)}%
      </span>
    </div>
  );
}