import { useEffect, useRef, useCallback } from 'react';
import { useSearchStore } from '../stores/searchStore';

interface UseSearchTimeoutOptions {
  timeoutMs?: number; // 默认 30 秒
  enabled?: boolean;
  onTimeout?: () => void;
}

export function useSearchTimeout({
  timeoutMs = 30000,
  enabled = true,
  onTimeout,
}: UseSearchTimeoutOptions = {}) {
  const { progress } = useSearchStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);

  // 开始计时
  const startTimer = useCallback(() => {
    if (!enabled) return;
    
    startTimeRef.current = Date.now();
    progress.setTimeout(false);
    
    // 清除之前的计时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 设置新的计时器
    timeoutRef.current = setTimeout(() => {
      progress.setTimeout(true);
      progress.setError({
        message: '搜索超时',
        details: `搜索请求在 ${timeoutMs / 1000} 秒内未完成，请稍后重试。`,
        code: 'TIMEOUT',
      });
      
      if (onTimeout) {
        onTimeout();
      }
    }, timeoutMs);
  }, [enabled, timeoutMs, progress, onTimeout]);

  // 清除计时器
  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // 重置状态
  const resetTimer = useCallback(() => {
    clearTimer();
    progress.setTimeout(false);
    progress.reset();
  }, [clearTimer, progress]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    startTimer,
    clearTimer,
    resetTimer,
    isTimeout: progress.isTimeout,
  };
}

// 取消搜索的 hook
interface UseSearchCancellationOptions {
  onCancel?: () => void;
}

export function useSearchCancellation({ onCancel }: UseSearchCancellationOptions = {}) {
  const { setIsLoading, setResults } = useSearchStore();
  const { progress } = useSearchStore();
  const isCancelledRef = useRef(false);

  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    setIsLoading(false);
    setResults({ merchants: [], products: [], totalResults: 0, query: '' });
    progress.reset();
    
    if (onCancel) {
      onCancel();
    }
  }, [setIsLoading, setResults, progress, onCancel]);

  const resetCancellation = useCallback(() => {
    isCancelledRef.current = false;
  }, []);

  return {
    cancel,
    resetCancellation,
    isCancelled: () => isCancelledRef.current,
  };
}

// 完整的搜索流程管理（包含超时）
interface UseSearchFlowOptions {
  timeoutMs?: number;
  onComplete?: () => void;
  onError?: (error: any) => void;
}

export function useSearchFlow(options: UseSearchFlowOptions = {}) {
  const { timeoutMs = 30000, onComplete, onError } = options;
  const { progress, setIsLoading, setResults } = useSearchStore();
  
  const { startTimer, clearTimer, resetTimer, isTimeout } = useSearchTimeout({
    timeoutMs,
    enabled: true,
    onTimeout: () => {
      setIsLoading(false);
    },
  });

  const { cancel, resetCancellation } = useSearchCancellation({
    onCancel: () => {
      clearTimer();
    },
  });

  // 开始搜索
  const startSearch = useCallback(async (searchFn: () => Promise<any>) => {
    resetCancellation();
    progress.startSearch();
    setIsLoading(true);
    startTimer();

    try {
      const result = await searchFn();
      clearTimer();
      setIsLoading(false);
      
      // 更新步骤状态
      progress.setStepStatus('parse', 'completed');
      progress.setStepStatus('match', 'completed');
      progress.setStepStatus('products', 'completed');
      
      setResults(result);
      
      if (onComplete) {
        onComplete();
      }
      
      return result;
    } catch (error: any) {
      clearTimer();
      setIsLoading(false);
      
      progress.setStepStatus('parse', 'error');
      progress.setError({
        message: error.message || '搜索失败',
        details: error.stack,
        code: error.code,
      });
      
      if (onError) {
        onError(error);
      }
      
      throw error;
    }
  }, [progress, setIsLoading, setResults, startTimer, clearTimer, resetCancellation, onComplete, onError]);

  // 重试搜索
  const retry = useCallback(async (searchFn: () => Promise<any>) => {
    resetTimer();
    return startSearch(searchFn);
  }, [resetTimer, startSearch]);

  return {
    startSearch,
    cancel,
    retry,
    isTimeout,
    progress,
  };
}