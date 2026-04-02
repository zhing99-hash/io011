import type { Product, Merchant } from '../api/mockData';

interface ProductListProps {
  products: Product[];
  merchants?: Merchant[];
  onProductClick?: (product: Product) => void;
  loading?: boolean;
}

// 获取商户信息
const getMerchantById = (merchantId: string, merchants: Merchant[] | undefined): Merchant | undefined => {
  return merchants?.find(m => m.id === merchantId);
};

// 商品卡片组件
function ProductCard({ 
  product, 
  merchant,
  onClick 
}: { 
  product: Product; 
  merchant?: Merchant;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="
        bg-white rounded-xl overflow-hidden shadow-sm
        hover:shadow-md transition-all duration-200
        cursor-pointer active:scale-[0.98]
        group
      "
    >
      {/* 商品图片 */}
      <div className="aspect-[3/2] bg-gray-100 overflow-hidden relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {/* 价格标签 */}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm">
          ¥{product.price}
        </div>
      </div>
      
      {/* 商品信息 */}
      <div className="p-3">
        <h5 className="font-semibold text-gray-800 truncate">
          {product.name}
        </h5>
        
        {/* 描述 */}
        <p className="text-gray-500 text-sm mt-1 line-clamp-2 h-10">
          {product.description}
        </p>
        
        {/* 商户信息 */}
        {merchant && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
            <img
              src={merchant.logo}
              alt={merchant.name}
              className="w-5 h-5 rounded object-cover"
            />
            <span className="text-xs text-gray-500 truncate">
              {merchant.name}
            </span>
            <span className="text-amber-500 text-xs flex items-center gap-0.5 ml-auto">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {merchant.rating.toFixed(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// 商品列表网格组件
export function ProductList({ products, merchants, onProductClick, loading }: ProductListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-xl overflow-hidden shadow-md animate-pulse"
          >
            <div className="aspect-[3/2] bg-gray-200" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          merchant={getMerchantById(product.merchantId, merchants)}
          onClick={() => onProductClick?.(product)}
        />
      ))}
    </div>
  );
}

// 紧凑版商品列表 (用于卡片内展开)
export function ProductGrid({ 
  products, 
  onProductClick 
}: { 
  products: Product[];
  onProductClick?: (product: Product) => void;
}) {
  return (
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
          <div className="aspect-[3/2] bg-gray-100 overflow-hidden">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="p-2.5">
            <h5 className="font-medium text-gray-800 text-sm truncate">
              {product.name}
            </h5>
            <p className="text-blue-600 font-semibold text-sm mt-1">
              ¥{product.price}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}