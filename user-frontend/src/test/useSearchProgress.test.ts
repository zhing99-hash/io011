import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchCancellation } from '../hooks/useSearchProgress';
import { useSearchStore } from '../stores/searchStore';

describe('useSearchCancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchStore.setState({
      isLoading: true,
      merchants: [],
      products: [],
      totalResults: 0,
    });
  });

  it('cancels search and resets state', async () => {
    useSearchStore.setState({
      isLoading: true,
      merchants: [{ id: '1', name: 'M', location: 'L', rating: 4, logo: '', categories: [], tags: [] }],
      products: [],
      totalResults: 1,
    });

    const { result } = renderHook(() => useSearchCancellation());

    await act(async () => {
      result.current.cancel();
    });

    expect(useSearchStore.getState().isLoading).toBe(false);
    expect(useSearchStore.getState().merchants).toEqual([]);
    expect(useSearchStore.getState().products).toEqual([]);
  });

  it('resets cancellation flag', async () => {
    useSearchStore.setState({
      isLoading: true,
      merchants: [],
      products: [],
      totalResults: 0,
    });

    const { result } = renderHook(() => useSearchCancellation());

    await act(async () => {
      result.current.cancel();
    });

    expect(result.current.isCancelled()).toBe(true);

    await act(async () => {
      result.current.resetCancellation();
    });

    expect(result.current.isCancelled()).toBe(false);
  });
});