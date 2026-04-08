import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchInput } from '../components/SearchInput';
import { useSearchStore } from '../stores/searchStore';

describe('SearchInput', () => {
  beforeEach(() => {
    // Reset store
    useSearchStore.setState({
      query: '',
      isLoading: false,
    });
    
    vi.clearAllMocks();
    localStorage.getItem = vi.fn().mockReturnValue(null);
    localStorage.setItem = vi.fn();
  });

  it('renders correctly', () => {
    render(<SearchInput />);
    expect(screen.getByPlaceholderText('搜索内容...')).toBeInTheDocument();
  });

  it('displays initial query value from store', () => {
    useSearchStore.setState({ query: 'test query' });
    render(<SearchInput />);
    expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
  });

  it('updates query in store when typing', () => {
    render(<SearchInput />);
    const input = screen.getByPlaceholderText('搜索内容...');
    
    fireEvent.change(input, { target: { value: 'new search' } });
    
    expect(useSearchStore.getState().query).toBe('new search');
  });

  it('calls onSearch callback when pressing Enter', async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchInput onSearch={onSearch} />);
    
    const input = screen.getByPlaceholderText('搜索内容...');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('test');
    });
  });

  it('shows validation error for empty input', async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchInput onSearch={onSearch} />);
    
    const input = screen.getByPlaceholderText('搜索内容...');
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText('请输入搜索内容')).toBeInTheDocument();
    });
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('shows validation error for input less than 2 characters', async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchInput onSearch={onSearch} />);
    
    const input = screen.getByPlaceholderText('搜索内容...');
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText('搜索词至少需要2个字符')).toBeInTheDocument();
    });
  });

  it('shows validation error for special characters', async () => {
    const onSearch = vi.fn().mockResolvedValue(undefined);
    render(<SearchInput onSearch={onSearch} />);
    
    const input = screen.getByPlaceholderText('搜索内容...');
    fireEvent.change(input, { target: { value: 'test<script>' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText('搜索词包含特殊字符')).toBeInTheDocument();
    });
  });

  it('shows clear button when query is not empty', () => {
    useSearchStore.setState({ query: 'test' });
    render(<SearchInput />);
    
    const clearButton = screen.getByRole('button');
    expect(clearButton).toBeInTheDocument();
  });

  it('clears query when clear button is clicked', () => {
    useSearchStore.setState({ query: 'test' });
    render(<SearchInput />);
    
    const clearButton = screen.getByRole('button');
    fireEvent.click(clearButton);
    
    expect(useSearchStore.getState().query).toBe('');
  });

  it('custom placeholder is displayed', () => {
    render(<SearchInput placeholder="Custom placeholder" />);
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('calls onFocus callback when input is focused', () => {
    const onFocus = vi.fn();
    render(<SearchInput onFocus={onFocus} />);
    
    const input = screen.getByPlaceholderText('搜索内容...');
    fireEvent.focus(input);
    
    expect(onFocus).toHaveBeenCalled();
  });

  it('calls onBlur callback when input loses focus', async () => {
    const onBlur = vi.fn();
    render(<SearchInput onBlur={onBlur} />);
    
    const input = screen.getByPlaceholderText('搜索内容...');
    fireEvent.blur(input);
    
    // Debounce for blur
    await new Promise(resolve => setTimeout(resolve, 300));
    expect(onBlur).toHaveBeenCalled();
  });
});