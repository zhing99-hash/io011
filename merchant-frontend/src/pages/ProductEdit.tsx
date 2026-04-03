import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import type { Product } from '../types';
import { getProductById, updateProduct, createProduct } from '../api/mockProducts';

interface FormErrors {
  name?: string;
  price?: string;
  stock?: string;
}

const STOCK_WARNING_THRESHOLD = 10;

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '',
    price: 0,
    stock: 0,
    status: 'inactive',
    image: '',
    description: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!isNew && id) {
      loadProduct();
    }
  }, [id, isNew]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const product = await getProductById(Number(id));
      if (product) {
        setFormData({
          name: product.name,
          price: product.price,
          stock: product.stock,
          status: product.status,
          image: product.image || '',
          description: product.description || ''
        });
      }
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '请输入商品名称';
    } else if (formData.name.length > 100) {
      newErrors.name = '商品名称不能超过100个字符';
    }
    
    if (formData.price <= 0) {
      newErrors.price = '请输入有效的价格';
    } else if (formData.price > 999999) {
      newErrors.price = '价格不能超过999999';
    }
    
    if (formData.stock < 0) {
      newErrors.stock = '库存不能为负数';
    } else if (!Number.isInteger(formData.stock)) {
      newErrors.stock = '库存必须为整数';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    try {
      if (isNew) {
        await createProduct(formData);
      } else {
        await updateProduct(Number(id), formData);
      }
      navigate('/products');
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    if (field === 'price' || field === 'stock') {
      const numValue = typeof value === 'string' ? parseInt(value) || 0 : value;
      setFormData(prev => ({ ...prev, [field]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
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
      <div className="mb-6">
        <button 
          onClick={() => navigate('/products')} 
          className="text-primary hover:underline flex items-center gap-1"
        >
          ← 返回商品列表
        </button>
      </div>
      
      <h2 className="text-2xl font-bold mb-6">{isNew ? '添加商品' : '编辑商品'}</h2>
      
      <div className="bg-white p-6 rounded-lg shadow-sm max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Name */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              商品名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.name ? 'border-red-500' : ''
              }`}
              placeholder="请输入商品名称"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Price and Stock Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                价格 (元) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.price || ''}
                onChange={(e) => handleChange('price', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.price ? 'border-red-500' : ''
                }`}
                placeholder="0"
                min="0"
                step="0.01"
              />
              {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
            </div>
            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                库存数量 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.stock || ''}
                onChange={(e) => handleChange('stock', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.stock ? 'border-red-500' : ''
                }`}
                placeholder="0"
                min="0"
                step="1"
              />
              {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock}</p>}
              {/* Stock Warning */}
              {formData.stock > 0 && formData.stock <= STOCK_WARNING_THRESHOLD && (
                <p className="text-orange-500 text-sm mt-1 flex items-center gap-1">
                  ⚠️ 库存紧张，当前库存: {formData.stock}
                </p>
              )}
              {formData.stock === 0 && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  ⚠️ 库存已售罄
                </p>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">商品状态</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={formData.status === 'active'}
                  onChange={() => handleChange('status', 'active')}
                  className="w-4 h-4 text-primary"
                />
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  上架
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={formData.status === 'inactive'}
                  onChange={() => handleChange('status', 'inactive')}
                  className="w-4 h-4 text-primary"
                />
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                  下架
                </span>
              </label>
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">商品图片</label>
            <input
              type="url"
              value={formData.image}
              onChange={(e) => handleChange('image', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
            {formData.image && (
              <div className="mt-2 w-24 h-24 rounded-lg overflow-hidden border">
                <img 
                  src={formData.image} 
                  alt="预览"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-700 mb-2 font-medium">商品描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={4}
              placeholder="请输入商品描述..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}