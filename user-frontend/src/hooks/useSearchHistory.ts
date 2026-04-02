import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'search_history';
const MAX_HISTORY = 10;

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // 初始化时从localStorage加载
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SearchHistoryItem[];
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  }, []);

  // 保存到localStorage
  const saveHistory = useCallback((newHistory: SearchHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }, []);

  // 添加搜索记录
  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return;

    const newItem: SearchHistoryItem = {
      query: query.trim(),
      timestamp: Date.now(),
    };

    // 去除重复项（保留最新的）
    const filtered = history.filter(item => item.query !== newItem.query);
    // 添加新项到开头
    const newHistory = [newItem, ...filtered].slice(0, MAX_HISTORY);
    saveHistory(newHistory);
  }, [history, saveHistory]);

  // 删除单条记录
  const removeFromHistory = useCallback((timestamp: number) => {
    const newHistory = history.filter(item => item.timestamp !== timestamp);
    saveHistory(newHistory);
  }, [history, saveHistory]);

  // 清空所有历史记录
  const clearHistory = useCallback(() => {
    saveHistory([]);
  }, [saveHistory]);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}