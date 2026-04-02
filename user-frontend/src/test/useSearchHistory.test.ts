import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchHistory } from '../hooks/useSearchHistory';

describe('useSearchHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem = vi.fn().mockReturnValue(null);
    localStorage.setItem = vi.fn();
    localStorage.clear();
  });

  it('initializes with empty history when no stored data', () => {
    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.history).toEqual([]);
  });

  it('loads history from localStorage on mount', () => {
    const storedHistory = [
      { query: 'search 1', timestamp: 1000 },
      { query: 'search 2', timestamp: 2000 },
    ];
    localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify(storedHistory));

    const { result } = renderHook(() => useSearchHistory());
    
    expect(result.current.history).toEqual(storedHistory);
  });

  it('handles invalid JSON in localStorage gracefully', () => {
    localStorage.getItem = vi.fn().mockReturnValue('invalid json');

    const { result } = renderHook(() => useSearchHistory());
    
    expect(result.current.history).toEqual([]);
  });

  it('adds new search query to history', async () => {
    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      result.current.addToHistory('new search');
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].query).toBe('new search');
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('adds new search at the beginning of history', async () => {
    const storedHistory = [
      { query: 'existing search', timestamp: 1000 },
    ];
    localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify(storedHistory));

    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      result.current.addToHistory('new search');
    });

    expect(result.current.history[0].query).toBe('new search');
    expect(result.current.history[1].query).toBe('existing search');
  });

  it('removes duplicate queries when adding new search', async () => {
    const storedHistory = [
      { query: 'duplicate', timestamp: 1000 },
      { query: 'other', timestamp: 2000 },
    ];
    localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify(storedHistory));

    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      result.current.addToHistory('duplicate');
    });

    // Should have only one "duplicate" entry (the new one)
    const duplicates = result.current.history.filter(h => h.query === 'duplicate');
    expect(duplicates).toHaveLength(1);
    // New one should be first
    expect(result.current.history[0].query).toBe('duplicate');
  });

  it('limits history to MAX_HISTORY items', async () => {
    const storedHistory = Array.from({ length: 10 }, (_, i) => ({
      query: `search ${i}`,
      timestamp: i * 1000,
    }));
    localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify(storedHistory));

    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      result.current.addToHistory('new search');
    });

    expect(result.current.history).toHaveLength(10);
    // New item should be first
    expect(result.current.history[0].query).toBe('new search');
    // Last item should be removed
    expect(result.current.history[9].query).toBe('search 8');
  });

  it('does not add empty query to history', async () => {
    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      result.current.addToHistory('   ');
    });

    expect(result.current.history).toHaveLength(0);
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('removes item from history by timestamp', async () => {
    const storedHistory = [
      { query: 'search 1', timestamp: 1000 },
      { query: 'search 2', timestamp: 2000 },
    ];
    localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify(storedHistory));

    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      result.current.removeFromHistory(1000);
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].query).toBe('search 2');
  });

  it('clears all history', async () => {
    const storedHistory = [
      { query: 'search 1', timestamp: 1000 },
      { query: 'search 2', timestamp: 2000 },
    ];
    localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify(storedHistory));

    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      result.current.clearHistory();
    });

    expect(result.current.history).toHaveLength(0);
    expect(localStorage.setItem).toHaveBeenCalledWith(expect.any(String), '[]');
  });
});