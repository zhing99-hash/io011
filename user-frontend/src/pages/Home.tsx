import { useState, useEffect, useMemo, useCallback } from 'react';
import { SearchInput } from '../components/SearchInput';
import { SearchSuggestions } from '../components/SearchSuggestions';
import { HotSearchTags } from '../components/HotSearchTags';
import { SearchProgress } from '../components/SearchProgress';
import { SearchError } from '../components/SearchError';
import { MerchantList } from '../components/MerchantCard';
import { ProductList } from '../components/ProductList';
import { NoResultsEmptyState, MerchantSkeleton } from '../components';
import { CategoryFilter, RegionFilter, PriceFilter, SortSelect } from '../components';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { useSearchStore } from '../stores/searchStore';
import { searchMockData } from '../api/mockData';

interface Suggestion {
  id: string;
  text: string;
  type?: 'history' | 'suggestion' | 'hot';
}

interface HotSearchTag {
  id: string;
  text: string;
  rank?: number;
}

// 餐饮热门搜索标签
const defaultHotSearchTags: HotSearchTag[] = [
  { id: '1', text: '火锅', rank: 1 },
  { id: '2', text: '烤鸭', rank: 2 },
  { id: '3', text: '川菜', rank: 3 },
  { id: '4', text: '粤菜' },
  { id: '5', text: '面食' },
  { id: '6', text: '烧烤' },
  { id: '7', text: '日料' },
  { id: '8', text: '西餐' },
];

// 搜索建议API
const fetchSuggestions = async (query: string): Promise<Suggestion[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const mockSuggestions: Suggestion[] = [
    { id: 's1', text: `${query} 餐厅`, type: 'suggestion' },
    { id: 's2', text: `${query} 美食`, type: 'suggestion' },
    { id: 's3', text: `${query} 推荐`, type: 'suggestion' },
  ];
  
  return mockSuggestions;
};

export default function Home() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const { 
    query, 
    setQuery,
    merchants,
    products,
    isLoading,
    setIsLoading,
    setResults,
    applyFilters,
    filters,
    updateFiltersFromUrl,
    rawMerchants,
    progress,
  } = useSearchStore();
  
  const { 
    history, 
    addToHistory, 
    removeFromHistory, 
    clearHistory 
  } = useSearchHistory();

  // 从 URL 初始化筛选条件
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryParam = params.get('q');
    if (queryParam) {
      setQuery(queryParam);
    }
    // 如果有筛选参数，加载并应用
    if (params.get('categories') || params.get('regions') || params.get('minPrice') || params.get('maxPrice') || params.get('sort')) {
      updateFiltersFromUrl(params);
    }
  }, []);

  // 当筛选条件变化时（已有原始数据时），重新应用筛选
  useEffect(() => {
    if (rawMerchants.length > 0) {
      applyFilters();
    }
  }, [filters.categories, filters.regions, filters.minPrice, filters.maxPrice, filters.sort]);

  // 组合所有建议
  const allSuggestions = useMemo(() => {
    const result: Suggestion[] = [];
    
    if (!query.trim()) {
      // 无输入时显示历史记录
      history.slice(0, 5).forEach(item => {
        result.push({
          id: `history-${item.timestamp}`,
          text: item.query,
          type: 'history'
        });
      });
      
      // 无输入时显示热门搜索
      if (result.length < 5) {
        defaultHotSearchTags.slice(0, 5 - result.length).forEach(tag => {
          result.push({
            id: `hot-${tag.id}`,
            text: tag.text,
            type: 'hot'
          });
        });
      }
    } else {
      // 有输入时显示匹配的历史记录
      history
        .filter(item => item.query.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .forEach(item => {
          result.push({
            id: `history-${item.timestamp}`,
            text: item.query,
            type: 'history'
          });
        });
        
      // 显示搜索建议
      suggestions.forEach(s => {
        if (!result.find(r => r.text === s.text)) {
          result.push(s);
        }
      });
    }
    
    return result;
  }, [query, history, suggestions]);

  // 获取实时搜索建议
  useEffect(() => {
    if (query.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const result = await fetchSuggestions(query);
        setSuggestions(result);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // 执行搜索
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    addToHistory(searchQuery);
    setHasSearched(true);
    setIsLoading(true);
    
    // 开始进度追踪
    progress.startSearch();
    
    try {
      // 步骤1: 解析需求
      await new Promise(resolve => setTimeout(resolve, 500));
      progress.setStepStatus('parse', 'completed');
      progress.setStepData('parse', { 
        status: 'completed',
        tags: [searchQuery],
      });
      
      // 步骤2: 匹配商户
      progress.setStepStatus('match', 'in-progress');
      await new Promise(resolve => setTimeout(resolve, 800));
      progress.setStepStatus('match', 'completed');
      
      // 步骤3: 获取商品
      progress.setStepStatus('products', 'in-progress');
      await new Promise(resolve => setTimeout(resolve, 600));
      progress.setStepStatus('products', 'completed');
      
      // 执行实际搜索
      const results = searchMockData(searchQuery);
      setResults(results);
      
    } catch (error) {
      console.error('Search error:', error);
      progress.setError({
        message: '搜索失败',
        details: '服务器错误，请稍后重试',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToHistory, progress, setIsLoading, setResults]);

  // 处理搜索
  const handleSearch = useCallback(async (searchQuery: string) => {
    progress.reset();
    await performSearch(searchQuery);
    setShowSuggestions(false);
  }, [performSearch]);

  // 处理建议选择
  const handleSuggestionSelect = useCallback((suggestion: Suggestion) => {
    setQuery(suggestion.text);
    handleSearch(suggestion.text);
  }, [setQuery, handleSearch]);

  // 处理热门标签点击
  const handleHotTagClick = useCallback((tag: HotSearchTag) => {
    setQuery(tag.text);
    handleSearch(tag.text);
  }, [setQuery, handleSearch]);

  // 处理历史记录删除
  const handleHistoryDelete = useCallback((timestamp: number) => {
    removeFromHistory(timestamp);
  }, [removeFromHistory]);

  // 处理推荐词点击
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  }, [setQuery, handleSearch]);

  // 是否显示搜索进度
  const showProgress = isLoading && progress.currentStep > 0;
  
  // 是否有错误
  const hasError = progress.error || progress.isTimeout;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            餐饮美食搜索
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* 标题区域 */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            发现美食
          </h2>
          <p className="text-gray-500 text-lg">
            搜索餐厅、小吃，发现美味
          </p>
        </div>

        {/* 搜索区域 */}
        <div className="relative mb-8">
          <SearchInput
            onSearch={handleSearch}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="搜索餐厅、美食..."
          />
          
          <SearchSuggestions
            visible={showSuggestions}
            suggestions={allSuggestions}
            onSelect={handleSuggestionSelect}
            onClose={() => setShowSuggestions(false)}
          />
        </div>

        {/* 搜索进度 */}
        {showProgress && (
          <div className="mb-8">
            <SearchProgress />
          </div>
        )}

        {/* 错误状态 */}
        {hasError && (
          <div className="mb-8">
            <SearchError 
              error={progress.error} 
              isTimeout={progress.isTimeout}
              onRetry={() => handleSearch(query)}
              onCancel={() => {
                progress.reset();
                setIsLoading(false);
              }}
            />
          </div>
        )}

        {/* 搜索结果展示 */}
        {!isLoading && !hasError && hasSearched && (
          <div className="space-y-4">
            {/* 筛选栏 */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-500">筛选:</span>
                <CategoryFilter />
                <RegionFilter />
                <PriceFilter />
                <div className="flex-1" />
                <SortSelect />
              </div>
            </div>
            
            {/* 结果统计 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                搜索结果
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({merchants.length} 家商户, {products.length} 件商品)
                </span>
              </h3>
            </div>
            
            {/* 有结果时展示 */}
            {merchants.length > 0 || products.length > 0 ? (
              <div className="space-y-6">
                {/* 商户列表（带展开商品） */}
                {merchants.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      商户推荐
                    </h4>
                    <MerchantList 
                      merchants={merchants} 
                      products={products}
                    />
                  </div>
                )}
                
                {/* 商品列表（不展示已在商户中展开的商品） */}
                {products.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      热门商品
                    </h4>
                    <ProductList 
                      products={products} 
                      merchants={merchants}
                    />
                  </div>
                )}
              </div>
            ) : (
              // 无结果时展示空状态
              <NoResultsEmptyState 
                query={query}
                onSuggestionClick={handleSuggestionClick}
              />
            )}
          </div>
        )}

        {/* 初始状态 - 等待搜索 */}
        {!hasSearched && !isLoading && (
          <>
            {/* 历史记录区域 */}
            {history.length > 0 && (
              <div className="mb-8 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    最近搜索
                  </h3>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    清空全部
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.slice(0, 10).map((item) => (
                    <div
                      key={item.timestamp}
                      className="group flex items-center gap-1 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1.5 text-sm text-gray-700 transition-colors cursor-pointer"
                      onClick={() => handleSearch(item.query)}
                    >
                      <span>{item.query}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHistoryDelete(item.timestamp);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-300 rounded-full transition-all"
                      >
                        <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 热门搜索区域 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <HotSearchTags
                tags={defaultHotSearchTags}
                onTagClick={handleHotTagClick}
                title="热门搜索"
              />
            </div>
          </>
        )}

        {/* 加载骨架屏 */}
        {isLoading && !showProgress && (
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
            <MerchantSkeleton count={3} />
          </div>
        )}
      </main>
    </div>
  );
}