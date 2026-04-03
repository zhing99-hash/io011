// 骨架屏组件 - 用于显示加载状态
interface ProductSkeletonProps {
  count?: number;
}

export function ProductSkeleton({ count = 4 }: ProductSkeletonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-xl overflow-hidden shadow-md animate-pulse"
        >
          {/* 图片骨架 */}
          <div className="aspect-[3/2] bg-gray-200" />
          
          {/* 内容骨架 */}
          <div className="p-3 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-full mt-3" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// 商户卡片骨架屏
interface MerchantSkeletonProps {
  count?: number;
}

export function MerchantSkeleton({ count = 3 }: MerchantSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl p-4 shadow-md animate-pulse"
        >
          <div className="flex items-start gap-4">
            {/* Logo 骨架 */}
            <div className="w-16 h-16 rounded-xl bg-gray-200 flex-shrink-0" />
            
            {/* 内容骨架 */}
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="flex gap-2 mt-2">
                <div className="h-6 bg-gray-200 rounded-full w-16" />
                <div className="h-6 bg-gray-200 rounded-full w-16" />
                <div className="h-6 bg-gray-200 rounded-full w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}