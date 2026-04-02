import { useState } from 'react';
import type { SearchError as SearchErrorType } from '../types/search';

interface SearchErrorProps {
  error: SearchErrorType | null;
  onRetry?: () => void;
  onCancel?: () => void;
  isTimeout?: boolean;
}

export function SearchError({ error, onRetry, onCancel, isTimeout = false }: SearchErrorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!error && !isTimeout) {
    return null;
  }

  const errorMessage = isTimeout 
    ? '搜索超时，请稍后重试或尝试更精确的关键词'
    : error?.message || '搜索过程中出现错误';

  const errorDetails = isTimeout
    ? '服务器响应时间过长，可能是由于网络延迟或请求量较大导致。请检查网络连接后重试。'
    : error?.details;

  const errorCode = error?.code;

  return (
    <div className="w-full bg-white rounded-2xl shadow-lg p-6 border border-red-100">
      {/* 错误头部 */}
      <div className="flex items-start gap-4">
        {/* 错误图标 */}
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          {isTimeout ? (
            <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </div>

        {/* 错误信息 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-800">
            {isTimeout ? '⏰ 搜索超时' : '❌ 搜索出错'}
          </h3>
          <p className="mt-1 text-gray-600">{errorMessage}</p>
          
          {/* 错误代码 */}
          {errorCode && (
            <div className="mt-2 inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-500 text-xs font-mono">
              错误码: {errorCode}
            </div>
          )}
        </div>
      </div>

      {/* 错误详情（可展开） */}
      {errorDetails && (
        <div className="mt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {isExpanded ? '收起详情' : '查看详情'}
          </button>
          
          {isExpanded && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono">
                {errorDetails}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="mt-6 flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="
              inline-flex items-center px-4 py-2 rounded-xl font-medium
              bg-primary text-white
              hover:bg-primary/90
              active:bg-primary/80
              transition-all duration-200
              shadow-md hover:shadow-lg
              focus:outline-none focus:ring-2 focus:ring-primary/50
            "
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重新搜索
          </button>
        )}
        
        {onCancel && (
          <button
            onClick={onCancel}
            className="
              inline-flex items-center px-4 py-2 rounded-xl font-medium
              bg-gray-100 text-gray-700
              hover:bg-gray-200
              active:bg-gray-300
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-gray-300
            "
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            取消搜索
          </button>
        )}
      </div>
    </div>
  );
}

// 超时提示组件（独立使用）
interface TimeoutWarningProps {
  seconds?: number;
  onCancel?: () => void;
}

export function TimeoutWarning({ onCancel }: TimeoutWarningProps) {

  // 倒计时效果可以通过外部计时器或 useEffect 实现
  // 这里仅展示 UI
  
  return (
    <div className="w-full bg-orange-50 border border-orange-200 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-orange-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-orange-800 font-medium">
            搜索时间较长，可能需要等待...
          </p>
          <p className="text-orange-600 text-sm mt-0.5">
            如果长时间无响应，建议取消搜索
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="
              flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium
              bg-orange-100 text-orange-700
              hover:bg-orange-200
              transition-colors
            "
          >
            取消
          </button>
        )}
      </div>
    </div>
  );
}