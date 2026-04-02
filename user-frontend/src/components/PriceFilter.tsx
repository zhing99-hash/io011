import { useState, useRef, useEffect } from 'react';
import { useSearchStore } from '../stores/searchStore';

interface PriceRange {
  label: string;
  min?: number;
  max?: number;
}

const priceRanges: PriceRange[] = [
  { label: '不限', min: undefined, max: undefined },
  { label: '0-50', min: 0, max: 50 },
  { label: '50-100', min: 50, max: 100 },
  { label: '100-200', min: 100, max: 200 },
  { label: '200-500', min: 200, max: 500 },
  { label: '500+', min: 500, max: undefined },
];

export function PriceFilter() {
  const [isOpen, setIsOpen] = useState(false);
  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { filters, setPriceRange } = useSearchStore();
  const { minPrice, maxPrice } = filters;
  
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
  
  // 选择预设价格段
  const selectPriceRange = (range: PriceRange) => {
    setPriceRange(range.min, range.max);
    
    const url = new URL(window.location.href);
    if (range.min !== undefined) {
      url.searchParams.set('minPrice', range.min.toString());
    } else {
      url.searchParams.delete('minPrice');
    }
    if (range.max !== undefined) {
      url.searchParams.set('maxPrice', range.max.toString());
    } else {
      url.searchParams.delete('maxPrice');
    }
    window.history.replaceState({}, '', url.toString());
  };
  
  // 应用自定义价格
  const applyCustomPrice = () => {
    const min = customMin ? Number(customMin) : undefined;
    const max = customMax ? Number(customMax) : undefined;
    
    if (min !== undefined || max !== undefined) {
      setPriceRange(min, max);
      
      const url = new URL(window.location.href);
      if (min !== undefined) {
        url.searchParams.set('minPrice', min.toString());
      } else {
        url.searchParams.delete('minPrice');
      }
      if (max !== undefined) {
        url.searchParams.set('maxPrice', max.toString());
      } else {
        url.searchParams.delete('maxPrice');
      }
      window.history.replaceState({}, '', url.toString());
    }
    
    setIsOpen(false);
  };
  
  // 清除价格筛选
  const clearPriceFilter = () => {
    setPriceRange(undefined, undefined);
    setCustomMin('');
    setCustomMax('');
    
    const url = new URL(window.location.href);
    url.searchParams.delete('minPrice');
    url.searchParams.delete('maxPrice');
    window.history.replaceState({}, '', url.toString());
  };
  
  // 判断是否有价格筛选
  const hasPriceFilter = minPrice !== undefined || maxPrice !== undefined;
  
  // 获取当前显示的筛选条件
  const currentRangeLabel = priceRanges.find(r => 
    r.min === minPrice && r.max === maxPrice
  )?.label || (minPrice !== undefined || maxPrice !== undefined ? '自定义' : '');
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
          ${hasPriceFilter 
            ? 'bg-primary/10 border-primary text-primary' 
            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
          }
        `}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>价格</span>
        {hasPriceFilter && (
          <span className="text-xs text-primary">
            {currentRangeLabel}
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
          {/* 预设价格段 */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 mb-2">价格区间</h4>
            <div className="grid grid-cols-3 gap-2">
              {priceRanges.map(range => (
                <button
                  key={range.label}
                  onClick={() => {
                    selectPriceRange(range);
                    if (range.min === undefined && range.max === undefined) {
                      setCustomMin('');
                      setCustomMax('');
                    }
                  }}
                  className={`
                    px-3 py-2 text-sm rounded-lg transition-all
                    ${(minPrice === range.min && maxPrice === range.max)
                      ? 'bg-primary text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* 自定义价格输入 */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 mb-2">自定义区间</h4>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={customMin}
                  onChange={(e) => setCustomMin(e.target.value)}
                  placeholder="最低"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <span className="text-gray-400">-</span>
              <div className="flex-1">
                <input
                  type="number"
                  value={customMax}
                  onChange={(e) => setCustomMax(e.target.value)}
                  placeholder="最高"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={applyCustomPrice}
                className="px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
          
          {/* 清除按钮 */}
          {hasPriceFilter && (
            <div className="pt-3 border-t border-gray-100">
              <button
                onClick={clearPriceFilter}
                className="w-full py-2 text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                清除价格筛选
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}