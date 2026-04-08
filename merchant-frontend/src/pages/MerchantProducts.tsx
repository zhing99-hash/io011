import React, { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category: string;
  images: string[];
  stock: number;
  status: 'active' | 'inactive';
  created_at: string;
}

const MerchantProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const merchantId = localStorage.getItem('merchant_id') || 'demo-merchant';

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    original_price: '',
    category: '',
    stock: '',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // 模拟数据
      const mockProducts: Product[] = [
        {
          id: 'p1',
          name: 'HUAWEI Mate 60 Pro',
          description: '雅丹黑 12GB+512GB',
          price: 6999,
          original_price: 7999,
          category: '数码',
          images: [],
          stock: 100,
          status: 'active',
          created_at: '2026-04-01',
        },
        {
          id: 'p2',
          name: 'FreeBuds Pro 3',
          description: '无线降噪耳机',
          price: 1499,
          original_price: 1699,
          category: '数码',
          images: [],
          stock: 50,
          status: 'active',
          created_at: '2026-04-02',
        },
        {
          id: 'p3',
          name: 'Watch GT 4',
          description: '46mm 黑色',
          price: 1688,
          original_price: 1888,
          category: '数码',
          images: [],
          stock: 30,
          status: 'inactive',
          created_at: '2026-04-03',
        },
      ];
      setProducts(mockProducts);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (editingProduct) {
      // 更新商品
      setProducts(products.map(p => 
        p.id === editingProduct.id 
          ? { ...p, ...formData, price: Number(formData.price) }
          : p
      ));
    } else {
      // 新增商品
      const newProduct: Product = {
        id: 'p' + Date.now(),
        ...formData,
        price: Number(formData.price),
        original_price: formData.original_price ? Number(formData.original_price) : undefined,
        images: [],
        stock: Number(formData.stock) || 0,
        status: 'active',
        created_at: new Date().toISOString().split('T')[0],
      };
      setProducts([newProduct, ...products]);
    }
    setShowModal(false);
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: '', original_price: '', category: '', stock: '' });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: String(product.price),
      original_price: product.original_price ? String(product.original_price) : '',
      category: product.category,
      stock: String(product.stock),
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个商品吗？')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const toggleStatus = (product: Product) => {
    setProducts(products.map(p => 
      p.id === product.id 
        ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' }
        : p
    ));
  };

  const categories = ['数码', '服装', '家居', '食品', '美妆', '运动'];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* 顶部header */}
      <header className="flex items-center justify-between p-6 border-b border-gray-700">
        <div>
          <h1 className="text-2xl font-bold">商品管理</h1>
          <p className="text-gray-400 text-sm mt-1">管理您的商品列表</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setFormData({ name: '', description: '', price: '', original_price: '', category: '', stock: '' });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
        >
          + 添加商品
        </button>
      </header>

      {/* 商品列表 */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无商品</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                  <th className="pb-3 font-medium">商品</th>
                  <th className="pb-3 font-medium">分类</th>
                  <th className="pb-3 font-medium">价格</th>
                  <th className="pb-3 font-medium">库存</th>
                  <th className="pb-3 font-medium">状态</th>
                  <th className="pb-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-gray-700/50">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-xl">
                          📦
                        </div>
                        <div>
                          <p className="font-medium text-white">{product.name}</p>
                          <p className="text-gray-500 text-xs">{product.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-gray-300">{product.category}</td>
                    <td className="py-4">
                      <span className="text-emerald-400 font-medium">¥{product.price}</span>
                      {product.original_price && (
                        <span className="ml-2 text-gray-500 line-through text-xs">¥{product.original_price}</span>
                      )}
                    </td>
                    <td className="py-4 text-gray-300">{product.stock}</td>
                    <td className="py-4">
                      <button
                        onClick={() => toggleStatus(product)}
                        className={`px-2 py-1 text-xs rounded-full ${
                          product.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {product.status === 'active' ? '上架' : '下架'}
                      </button>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 添加/编辑商品弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">
              {editingProduct ? '编辑商品' : '添加商品'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">商品名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  placeholder="请输入商品名称"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">商品描述</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  placeholder="请输入商品描述"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">价格</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">原价 (可选)</label>
                  <input
                    type="number"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">分类</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">选择分类</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">库存</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingProduct(null);
                }}
                className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantProducts;