import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchStore } from '../stores/searchStore';

interface Suggestion {
  id: string;
  text: string;
  type?: 'history' | 'suggestion' | 'hot';
}

interface SearchSuggestionsProps {
  visible: boolean;
  suggestions?: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
  onClose?: () => void;
}

export function SearchSuggestions({
  visible,
  suggestions = [],
  onSelect,
  onClose
}: SearchSuggestionsProps) {
  const { query } = useSearchStore();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  // 当建议列表变化时重置选中状态
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  // 键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!visible || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          onSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        if (onClose) onClose();
        break;
    }
  }, [visible, suggestions, selectedIndex, onSelect, onClose]);

  // 滚动选中项 into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedItem = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (onClose && visible) {
        const target = e.target as HTMLElement;
        if (!target.closest('.search-suggestions-container')) {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, visible]);

  if (!visible) return null;

  // 高亮匹配文本
  const highlightMatch = (text: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) 
        ? <span key={i} className="bg-yellow-200 font-semibold">{part}</span>
        : part
    );
  };

  return (
    <div 
      className="search-suggestions-container absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-50"
    >
      <ul 
        ref={listRef}
        className="max-h-80 overflow-y-auto"
        onKeyDown={handleKeyDown}
      >
        {suggestions.length === 0 ? (
          <li className="px-4 py-8 text-center text-gray-400">
            <svg className="mx-auto h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            没有找到相关建议
          </li>
        ) : (
          suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              className={`
                flex items-center px-4 py-3 cursor-pointer transition-colors
                ${index === selectedIndex ? 'bg-primary/10' : 'hover:bg-gray-50'}
              `}
              onClick={() => onSelect(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {/* 图标 */}
              <span className="flex-shrink-0 mr-3">
                {suggestion.type === 'history' ? (
                  <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : suggestion.type === 'hot' ? (
                  <svg className="h-4 w-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2 15H10v-1h4v1zm0-2H10v-1h4v1zm1.31-3.26L15 14.48V15h-1v-.52l-.31-.26C12.87 13.55 12 12.28 12 11c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.28-.87 2.55-2.69 3.22z"/>
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </span>
              
              {/* 文本 */}
              <span className="flex-1 text-gray-700">
                {highlightMatch(suggestion.text)}
              </span>

              {/* 类型标签 */}
              {suggestion.type && (
                <span className={`
                  text-xs px-2 py-0.5 rounded-full
                  ${suggestion.type === 'hot' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}
                `}>
                  {suggestion.type === 'history' ? '历史' : 
                   suggestion.type === 'hot' ? '热门' : '建议'}
                </span>
              )}

              {/* 选中状态指示器 */}
              {index === selectedIndex && (
                <span className="ml-2 text-primary text-sm">
                  Enter 选中
                </span>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}