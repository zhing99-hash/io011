import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const API_BASE = 'https://api.io011.com/api/v1';

interface Merchant {
  id: string;
  name: string;
  logo_url?: string;
  endpoint?: string;
  tags: { categories?: string[]; capabilities?: string[]; location?: string };
  reputation?: { score: number; transactions: number };
}

const UserMerchants: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const searchTerm = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';

  useEffect(() => {
    fetchMerchants();
  }, [searchTerm, category]);

  const fetchMerchants = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/search/?limit=20`;
      if (searchTerm) {
        url += `&tags=${encodeURIComponent(searchTerm)}`;
      }
      if (category) {
        url += `&category=${encodeURIComponent(category)}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.merchants) {
        setMerchants(data.merchants);
      }
    } catch (err) {
      console.error('Failed to fetch merchants:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['电子产品', '服装鞋帽', '食品生鲜', '美妆护肤', '家居用品', '运动户外'];

  const getMerchantTags = (merchant: Merchant) => {
    const tags = [
      ...(merchant.tags?.categories || []),
      ...(merchant.tags?.capabilities || [])
    ];
    return tags.slice(0, 2);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* 搜索框 */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm mb-6">
        <div className="relative">
          <input 
            type="text" 
            placeholder="搜索商户..." 
            defaultValue={searchTerm}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                setSearchParams({ q: e.currentTarget.value });
              }
            }}
            className="w-full px-5 py-3 bg-gray-50 border-0 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
          <button 
            onClick={() => fetchMerchants()}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center hover:bg-sky-600"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
        
        {/* 分类筛选 */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button 
            onClick={() => setSearchParams({})}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !category ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSearchParams({ category: cat })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === cat ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 商户列表 */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {searchTerm ? `搜索"${searchTerm}"的结果` : '全部商户'}
          </h2>
          <span className="text-sm text-gray-500">{merchants.length} 个商户</span>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : merchants.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🏪</div>
            <p className="text-gray-500">暂无商户</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {merchants.map((merchant) => (
              <div 
                key={merchant.id} 
                className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {merchant.logo_url ? (
                      <img src={merchant.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      merchant.name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-800 truncate">{merchant.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {getMerchantTags(merchant).join(' · ')}
                    </p>
                    {merchant.reputation?.transactions && (
                      <p className="text-xs text-green-600 mt-1">
                        {merchant.reputation.transactions} 笔交易 · 评分 {merchant.reputation.score}
                      </p>
                    )}
                  </div>
                </div>
                <button className="w-full mt-3 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors">
                  进入店铺
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserMerchants;