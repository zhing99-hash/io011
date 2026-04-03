import { useState, useRef, useEffect } from 'react';
import { useSearchStore } from '../stores/searchStore';
import { mockMerchants } from '../api/mockData';

// 从商户数据中提取所有类目
const allCategories = Array.from(
  new Set(mockMerchants.flatMap(m => m.categories))
).sort();

// 热门类目
const popularCategories = ['火锅', '烤鸭', '川菜', '粤菜', '西北菜'];

export function CategoryFilter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { filters, setCategories } = useSearchStore();
  const { categories } = filters;
  
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
  
  // 切换类目选择
  const toggleCategory = (category: string) => {
    const newCategories = categories.includes(category)
      ? categories.filter(c => c !== category)
      : [...categories, category];
    setCategories(newCategories);
    
    // 更新 URL 参数
    const url = new URL(window.location.href);
    if (newCategories.length > 0) {
      url.searchParams.set('categories', newCategories.join(','));
    } else {
      url.searchParams.delete('categories');
    }
    window.history.replaceState({}, '', url.toString());
  };
  
  // 获取当前选择数量
  const selectedCount = categories.length;
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
          ${selectedCount > 0 
            ? 'bg-primary/10 border-primary text-primary' 
            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
          }
        `}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <span>类目</span>
        {selectedCount > 0 && (
          <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
            {selectedCount}
          </span>
        )}
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 z-50 p-4">
          {/* 热门类目 */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 mb-2">热门类目</h4>
            <div className="flex flex-wrap gap-2">
              {popularCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`
                    px-3 py-1.5 text-sm rounded-full transition-all
                    ${categories.includes(cat)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          {/* 所有类目 */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-2">全部类目</h4>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {allCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`
                    px-3 py-1.5 text-sm rounded-full transition-all
                    ${categories.includes(cat)
                      ? 'bg-primary text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          {/* 已选择显示 */}
          {selectedCount > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  已选择: <strong>{selectedCount}</strong> 个类目
                </span>
                <button
                  onClick={() => {
                    setCategories([]);
                    const url = new URL(window.location.href);
                    url.searchParams.delete('categories');
                    window.history.replaceState({}, '', url.toString());
                  }}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  清除
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}