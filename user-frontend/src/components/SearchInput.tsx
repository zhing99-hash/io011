import { useState, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useSearchStore } from '../stores/searchStore';

interface SearchInputProps {
  onSearch?: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  validation?: (query: string) => { valid: boolean; message?: string };
}

export function SearchInput({
  onSearch,
  onFocus,
  onBlur,
  placeholder = '搜索内容...',
  validation
}: SearchInputProps) {
  const { query, setQuery, isLoading, setIsLoading } = useSearchStore();
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 默认验证函数
  const defaultValidation = (q: string) => {
    if (!q.trim()) {
      return { valid: false, message: '请输入搜索内容' };
    }
    if (q.trim().length < 2) {
      return { valid: false, message: '搜索词至少需要2个字符' };
    }
    if (q.length > 100) {
      return { valid: false, message: '搜索词不能超过100个字符' };
    }
    // 特殊字符过滤
    const specialChars = /[<>\"'&]/;
    if (specialChars.test(q)) {
      return { valid: false, message: '搜索词包含特殊字符' };
    }
    return { valid: true };
  };

  const validate = validation || defaultValidation;

  // 处理搜索
  const handleSearch = async (searchQuery: string) => {
    const result = validate(searchQuery);
    
    if (!result.valid) {
      setError(result.message || '输入无效');
      return;
    }

    setError(null);
    setIsLoading(true);
    
    try {
      if (onSearch) {
        await onSearch(searchQuery);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 处理Enter键
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  // 输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // 清除错误提示
    if (error) {
      setError(null);
    }
  };

  // 焦点处理
  const handleFocus = () => {
    setIsFocused(true);
    if (onFocus) onFocus();
  };

  const handleBlur = () => {
    // 延迟处理以便点击建议项
    setTimeout(() => {
      setIsFocused(false);
      if (onBlur) onBlur();
    }, 200);
  };

  return (
    <div className="relative w-full">
      <div
        className={`
          relative flex items-center bg-white rounded-xl border-2 transition-all duration-300
          ${isFocused 
            ? 'border-primary shadow-lg scale-[1.02]' 
            : 'border-gray-200 hover:border-gray-300'
          }
          ${error ? 'border-red-400' : ''}
        `}
      >
        {/* 搜索图标 */}
        <div className="absolute left-4 flex-shrink-0">
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        {/* 输入框 */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={isLoading}
          className={`
            w-full py-4 pl-12 pr-4 text-base bg-transparent outline-none
            placeholder-gray-400 text-gray-800
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />

        {/* 清除按钮 */}
        {query && !isLoading && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="absolute left-0 top-full mt-1 text-sm text-red-500 flex items-center gap-1">
          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}