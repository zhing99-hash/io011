import { useState, useRef, useEffect } from 'react';
import { useSearchStore } from '../stores/searchStore';

// 常用地区列表（基于商户数据简化）
const commonRegions = [
  '北京市朝阳区',
  '北京市海淀区',
  '北京市东城区',
  '北京市西城区',
];

// 北京区域
const beijingDistricts = ['朝阳区', '海淀区', '东城区', '西城区', '丰台区', '石景山区', '通州区', '顺义区'];

export function RegionFilter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { filters, setRegions } = useSearchStore();
  const { regions } = filters;
  
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
  
  // 切换地区选择
  const toggleRegion = (region: string) => {
    const newRegions = regions.includes(region)
      ? regions.filter(r => r !== region)
      : [...regions, region];
    setRegions(newRegions);
    
    // 更新 URL 参数
    const url = new URL(window.location.href);
    if (newRegions.length > 0) {
      url.searchParams.set('regions', newRegions.join(','));
    } else {
      url.searchParams.delete('regions');
    }
    window.history.replaceState({}, '', url.toString());
  };
  
  const selectedCount = regions.length;
  
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>地区</span>
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
          {/* 常用地区快捷选项 */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 mb-2">常用地区</h4>
            <div className="flex flex-wrap gap-2">
              {commonRegions.map(region => (
                <button
                  key={region}
                  onClick={() => toggleRegion(region)}
                  className={`
                    px-3 py-1.5 text-sm rounded-full transition-all
                    ${regions.includes(region)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {region.replace('北京市', '')}
                </button>
              ))}
            </div>
          </div>
          
          {/* 北京各区 */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-2">北京区县</h4>
            <div className="flex flex-wrap gap-2">
              {beijingDistricts.map(district => {
                const region = `北京市${district}`;
                return (
                  <button
                    key={district}
                    onClick={() => toggleRegion(region)}
                    className={`
                      px-3 py-1.5 text-sm rounded-full transition-all
                      ${regions.includes(region)
                        ? 'bg-primary text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    {district}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* 已选择显示 */}
          {selectedCount > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  已选择: <strong>{selectedCount}</strong> 个地区
                </span>
                <button
                  onClick={() => {
                    setRegions([]);
                    const url = new URL(window.location.href);
                    url.searchParams.delete('regions');
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