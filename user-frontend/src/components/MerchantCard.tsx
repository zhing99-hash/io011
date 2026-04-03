import { useState } from 'react';
import type { Merchant, Product } from '../api/mockData';
import { ProductSkeleton } from './ProductSkeleton';

interface MerchantCardProps {
  merchant: Merchant;
  products: Product[];
  onProductClick?: (product: Product) => void;
}

// 商户卡片组件
export function MerchantCard({ merchant, products, onProductClick }: MerchantCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  
  // 点击展开/收起商品列表
  const handleToggle = async () => {
    if (!isExpanded && products.length > 0) {
      // 展开时模拟加载效果
      setIsLoadingProducts(true);
      // 模拟网络延迟，产生渐进式加载效果
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsLoadingProducts(false);
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
      {/* 商户卡片头部 */}
      <div 
        onClick={handleToggle}
        className="p-4 cursor-pointer active:bg-gray-50 transition-colors"
      >
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
            <img
              src={merchant.logo}
              alt={merchant.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          
          {/* 商户信息 */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-800 truncate">
              {merchant.name}
            </h3>
            
            {/* 评分和地区 */}
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {merchant.rating.toFixed(1)}
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-500 text-sm flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {merchant.location}
              </span>
            </div>
            
            {/* 类目标签 */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {merchant.categories.map((category) => (
                <span
                  key={category}
                  className="px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-full"
                >
                  {category}
                </span>
              ))}
              {merchant.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          
          {/* 展开/收起图标 */}
          <div className="flex-shrink-0">
            <div className={`
              w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center
              transition-transform duration-300
              ${isExpanded ? 'rotate-180' : ''}
            `}>
              <svg 
                className="w-5 h-5 text-blue-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {/* 展开的商品列表区域 */}
      <div 
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        {/* 分割线 */}
        <div className="border-t border-gray-100" />
        
        {/* 商品列表 */}
        <div className="p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-600">
              本店商品 ({products.length}件)
            </h4>
          </div>
          
          {/* 加载状态 - 骨架屏 */}
          {isLoadingProducts ? (
            <ProductSkeleton count={4} />
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => onProductClick?.(product)}
                  className="
                    bg-white rounded-xl overflow-hidden shadow-sm
                    hover:shadow-md transition-all duration-200
                    cursor-pointer active:scale-[0.98]
                  "
                >
                  {/* 商品图片 */}
                  <div className="aspect-[3/2] bg-gray-100 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  
                  {/* 商品信息 */}
                  <div className="p-2.5">
                    <h5 className="font-medium text-gray-800 text-sm truncate">
                      {product.name}
                    </h5>
                    <p className="text-blue-600 font-semibold mt-1">
                      ¥{product.price}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p>暂无商品</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 商户卡片列表组件
interface MerchantListProps {
  merchants: Merchant[];
  products: Product[];
  onProductClick?: (product: Product) => void;
}

export function MerchantList({ merchants, products, onProductClick }: MerchantListProps) {
  // 按商户 ID 分组商品
  const getProductsByMerchant = (merchantId: string) => {
    return products.filter(p => p.merchantId === merchantId);
  };

  return (
    <div className="space-y-3">
      {merchants.map((merchant) => (
        <MerchantCard
          key={merchant.id}
          merchant={merchant}
          products={getProductsByMerchant(merchant.id)}
          onProductClick={onProductClick}
        />
      ))}
    </div>
  );
}