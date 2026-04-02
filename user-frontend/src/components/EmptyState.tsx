// 空状态组件 - 无结果时的展示
interface EmptyStateProps {
  title?: string;
  description?: string;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

// 推荐搜索词
const defaultSuggestions = [
  '火锅',
  '烤鸭',
  '川菜',
  '粤菜',
  '面食',
];

// 空状态图标 SVG 组件
function EmptyIcon() {
  return (
    <svg 
      className="w-24 h-24 text-gray-300" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
      />
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M8 11h.01M12 11h.01M16 11h.01M9 16h6" 
      />
    </svg>
  );
}

// 空状态组件
export function EmptyState({
  title = '未找到相关结果',
  description = '换个关键词试试，或者看看下面的推荐',
  suggestions = defaultSuggestions,
  onSuggestionClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* 空状态插画 */}
      <div className="mb-6">
        <EmptyIcon />
      </div>
      
      {/* 标题 */}
      <h3 className="text-xl font-semibold text-gray-700 mb-2">
        {title}
      </h3>
      
      {/* 描述 */}
      <p className="text-gray-500 text-center max-w-sm mb-6">
        {description}
      </p>
      
      {/* 推荐搜索词 */}
      {suggestions.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-3">试试这些关键词</p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="
                  px-4 py-2 rounded-full text-sm font-medium
                  bg-white border border-gray-200 text-gray-600
                  hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600
                  active:bg-blue-100
                  transition-all duration-200
                  shadow-sm hover:shadow
                "
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 初始空状态 - 等待搜索
export function InitialEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* 搜索图标 */}
      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
        <svg 
          className="w-10 h-10 text-blue-400" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
          />
        </svg>
      </div>
      
      <h3 className="text-xl font-semibold text-gray-700 mb-2">
        搜索您感兴趣的内容
      </h3>
      <p className="text-gray-500 text-center max-w-sm">
        输入关键词或从热门标签中选择开始搜索
      </p>
    </div>
  );
}

// 无结果空状态 - 搜索无结果
export function NoResultsEmptyState({ 
  query,
  onSuggestionClick 
}: { 
  query: string;
  onSuggestionClick?: (suggestion: string) => void;
}) {
  // 根据查询词智能推荐
  const getSuggestions = () => {
    const q = query.toLowerCase();
    if (q.includes('火锅') || q.includes('川味')) {
      return ['海底捞', '川菜', '麻辣'];
    }
    if (q.includes('烤鸭') || q.includes('京菜')) {
      return ['全聚德', '京菜', '烤鸭'];
    }
    if (q.includes('粤菜') || q.includes('茶餐厅')) {
      return ['粤菜', '点心', '早茶'];
    }
    return defaultSuggestions;
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-md p-8">
      <EmptyState 
        title="未找到相关结果"
        description={`未找到与"${query}"相关的商户或商品`}
        suggestions={getSuggestions()}
        onSuggestionClick={onSuggestionClick}
      />
    </div>
  );
}