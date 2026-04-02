import { useState, useRef, useEffect } from 'react';
import { useSearchStore } from '../stores/searchStore';
import type { SortOption } from '../stores/searchStore';

interface SortOptionItem {
  value: SortOption;
  label: string;
  icon: React.ReactNode;
}

const sortOptions: SortOptionItem[] = [
  {
    value: 'relevance',
    label: '相关度',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    value: 'price-asc',
    label: '价格升序',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ),
  },
  {
    value: 'price-desc',
    label: '价格降序',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    ),
  },
  {
    value: 'rating',
    label: '评分优先',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
];

export function SortSelect() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { filters, setSort } = useSearchStore();
  
  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // 选择排序方式
  const selectSort = (sort: SortOption) => {
    setSort(sort);
    
    // 更新 URL 参数
    const url = new URL(window.location.href);
    url.searchParams.set('sort', sort);
    window.history.replaceState({}, '', url.toString());
    
    setIsOpen(false);
  };
  
  const currentSort = sortOptions.find(o => o.value === filters.sort) || sortOptions[0];
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 px-4 py-2 rounded-lg border 
          bg-white border-gray-200 text-gray-700 
          hover:border-gray-300 transition-all
        "
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
        </svg>
        <span>排序:</span>
        <span className="text-primary font-medium">{currentSort.label}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-1">
          {sortOptions.map(option => (
            <button
              key={option.value}
              onClick={() => selectSort(option.value)}
              className={`
                w-full flex items-center gap-2 px-4 py-2.5 text-left
                transition-colors
                ${filters.sort === option.value
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <span className={filters.sort === option.value ? 'text-primary' : 'text-gray-400'}>
                {option.icon}
              </span>
              <span className="text-sm">{option.label}</span>
              {filters.sort === option.value && (
                <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}