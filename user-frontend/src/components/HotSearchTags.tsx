import { useRef } from 'react';

interface HotSearchTag {
  id: string;
  text: string;
  rank?: number;
}

interface HotSearchTagsProps {
  tags: HotSearchTag[];
  onTagClick: (tag: HotSearchTag) => void;
  title?: string;
}

export function HotSearchTags({
  tags,
  onTagClick,
  title = '热门搜索'
}: HotSearchTagsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 滚动处理
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="w-full">
      {/* 标题和滚动按钮 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
          <svg className="h-4 w-4 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"/>
          </svg>
          {title}
        </h3>
        
        {tags.length > 5 && (
          <div className="flex gap-1">
            <button
              onClick={() => scroll('left')}
              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="向左滚动"
            >
              <svg className="h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="向右滚动"
            >
              <svg className="h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 标签容器 */}
      <div 
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-2"
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        {tags.map((tag, index) => (
          <button
            key={tag.id}
            onClick={() => onTagClick(tag)}
            className={`
              flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
              transition-all duration-200 hover:scale-105 cursor-pointer
              flex items-center gap-1.5
              ${index < 3 
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md hover:shadow-lg' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {/* 排名徽章 */}
            {tag.rank && tag.rank <= 3 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs">
                {tag.rank}
              </span>
            )}
            {tag.text}
          </button>
        ))}
      </div>
    </div>
  );
}