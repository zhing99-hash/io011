import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import type { Product, ProductsFilter } from '../types';
import { getProducts, updateProductStatus } from '../api/mockProducts';

const PAGE_SIZE = 5;

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ProductsFilter>({
    search: '',
    status: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    product: Product | null;
    action: 'active' | 'inactive' | null;
  }>({ show: false, product: null, action: null });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search and status
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(filter.search.toLowerCase());
      const matchesStatus = filter.status === 'all' || product.status === filter.status;
      return matchesSearch && matchesStatus;
    });
  }, [products, filter]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter.search, filter.status]);

  const handleStatusToggle = async () => {
    if (!confirmDialog.product || !confirmDialog.action) return;

    const newStatus = confirmDialog.action;
    const updated = await updateProductStatus(confirmDialog.product.id, newStatus);
    
    if (updated) {
      setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
    
    setConfirmDialog({ show: false, product: null, action: null });
  };

  const openConfirmDialog = (product: Product, action: 'active' | 'inactive') => {
    setConfirmDialog({ show: true, product, action });
  };

  if (loading) {
    return (
      <Layout activePath="/products">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activePath="/products">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">商品管理</h2>
        <button 
          onClick={() => navigate('/products/new')}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
        >
          + 添加商品
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-4 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="搜索商品名称..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value as ProductsFilter['status'] })}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="all">全部状态</option>
          <option value="active">上架</option>
          <option value="inactive">下架</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold w-20">图片</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">商品名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold w-24">价格</th>
              <th className="px-4 py-3 text-left text-sm font-semibold w-24">库存</th>
              <th className="px-4 py-3 text-left text-sm font-semibold w-24">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold w-40">操作</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  暂无商品数据
                </td>
              </tr>
            ) : (
              paginatedProducts.map((product) => (
                <tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=商品';
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-primary font-semibold">¥{product.price}</td>
                  <td className="px-4 py-3">
                    <span className={product.stock <= 10 && product.stock > 0 ? 'text-orange-500' : product.stock === 0 ? 'text-red-500' : ''}>
                      {product.stock}
                    </span>
                    {product.stock <= 10 && product.stock > 0 && (
                      <span className="ml-1 text-xs text-orange-500">库存紧张</span>
                    )}
                    {product.stock === 0 && (
                      <span className="ml-1 text-xs text-red-500">已售罄</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-sm ${
                      product.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {product.status === 'active' ? '上架' : '下架'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link 
                        to={`/products/${product.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        编辑
                      </Link>
                      {product.status === 'active' ? (
                        <button
                          onClick={() => openConfirmDialog(product, 'inactive')}
                          className="text-gray-500 hover:text-gray-700 text-sm"
                        >
                          下架
                        </button>
                      ) : (
                        <button
                          onClick={() => openConfirmDialog(product, 'active')}
                          className="text-green-600 hover:text-green-700 text-sm"
                        >
                          上架
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              共 {filteredProducts.length} 条记录，第 {currentPage}/{totalPages} 页
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 border rounded text-sm ${
                    currentPage === page 
                      ? 'bg-primary text-white border-primary' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      {confirmDialog.show && confirmDialog.product && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              {confirmDialog.action === 'active' ? '上架商品' : '下架商品'}
            </h3>
            <p className="text-gray-600 mb-6">
              确定要将「{confirmDialog.product.name}」{confirmDialog.action === 'active' ? '上架' : '下架'}吗？
              {confirmDialog.action === 'inactive' && '下架后商品将不在店铺中展示。'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog({ show: false, product: null, action: null })}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleStatusToggle}
                className={`px-4 py-2 text-white rounded-lg ${
                  confirmDialog.action === 'active' 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-gray-500 hover:bg-gray-600'
                }`}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}