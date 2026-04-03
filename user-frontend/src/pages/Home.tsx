import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE = 'https://api.io011.com/api/v1';

interface Merchant {
  id: string;
  name: string;
  logo_url?: string;
  tags: { categories?: string[]; capabilities?: string[] };
  reputation?: { score: number; transactions: number };
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const userId = localStorage.getItem('user_id');
  const nickname = localStorage.getItem('user_nickname') || '小明';
  
  const [searchStep, setSearchStep] = useState(0);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 退出登录
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };
  
  // 加载推荐商户
  useEffect(() => {
    fetchRecommendedMerchants();
  }, []);

  const fetchRecommendedMerchants = async () => {
    try {
      const res = await fetch(`${API_BASE}/search/recommended?limit=5`);
      const data = await res.json();
      if (data.merchants) {
        setMerchants(data.merchants);
      }
    } catch (err) {
      console.error('Failed to fetch merchants:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchStep(1);
    setLoading(true);
    
    try {
      // 搜索商户
      const res = await fetch(`${API_BASE}/search/?tags=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await res.json();
      
      setTimeout(() => setSearchStep(2), 500);
      setTimeout(() => setSearchStep(3), 1500);
      
      if (data.merchants) {
        setMerchants(data.merchants);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setTimeout(() => setSearchStep(2), 500);
      setTimeout(() => setSearchStep(3), 1500);
    } finally {
      setLoading(false);
    }
  };

  const hotSearches = ['iPhone', '小米手机', '运动鞋', '美妆'];

  // 获取商户标签
  const getMerchantTags = (merchant: Merchant) => {
    const tags = [
      ...(merchant.tags?.categories || []),
      ...(merchant.tags?.capabilities || [])
    ];
    return tags.slice(0, 2);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* 欢迎区域 */}
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm mb-6 sm:mb-8 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate('/profile')}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-left">
            <p className="text-gray-500 text-sm">
              {userId ? '欢迎回来' : '欢迎使用'}
            </p>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 mt-1">
              {userId ? `${nickname} 👋` : '请先登录'}
            </h1>
            {userId && (
              <p className="text-xs text-gray-400 mt-1">点击进入个人中心</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white text-xl sm:text-2xl">
              {userId ? '👤' : '🔓'}
            </div>
            {userId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                退出
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8">
        <div className="relative">
          <input 
            type="text" 
            placeholder="搜索商品、商户..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full px-5 sm:px-6 py-3 sm:py-4 bg-gray-50 border-0 rounded-xl sm:rounded-2xl text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-sky-500 rounded-xl sm:rounded-2xl flex items-center justify-center hover:bg-sky-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
        {/* 热门搜索 */}
        <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
          <span className="text-sm text-gray-500">热门:</span>
          {hotSearches.map((item, idx) => (
            <button 
              key={idx}
              onClick={() => { setSearchQuery(item); handleSearch(); }}
              className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* 搜索进度条 */}
      {searchStep > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8">
          <h3 className="font-semibold text-gray-800 mb-4">搜索进度</h3>
          <div className="space-y-4">
            {/* 步骤1: 解析需求 */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                searchStep >= 1 ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {searchStep >= 1 ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-gray-400 font-medium text-sm">1</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1">
                  <span className={`text-sm font-medium ${searchStep >= 1 ? 'text-gray-800' : 'text-gray-400'}`}>解析需求</span>
                  <span className="text-sm text-gray-500">
                    {searchStep >= 1 ? '完成' : '等待中'}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-500" 
                    style={{ width: searchStep >= 1 ? '100%' : '0%' }}
                  />
                </div>
              </div>
            </div>
            
            {/* 步骤2: 匹配商户 */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                searchStep >= 2 ? 'bg-green-100' : searchStep === 1 ? 'bg-sky-100' : 'bg-gray-100'
              }`}>
                {searchStep >= 2 ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className={searchStep >= 1 ? 'text-sky-600 font-medium text-sm' : 'text-gray-400 font-medium text-sm'}>2</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1">
                  <span className={`text-sm font-medium ${searchStep >= 2 ? 'text-gray-800' : 'text-gray-400'}`}>匹配商户</span>
                  <span className="text-sm text-gray-500">
                    {searchStep >= 2 ? '完成' : searchStep === 1 ? '进行中...' : '等待中'}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      searchStep === 1 ? 'bg-sky-500 animate-pulse' : searchStep >= 2 ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                    style={{ width: searchStep >= 2 ? '100%' : searchStep === 1 ? '60%' : '0%' }}
                  />
                </div>
              </div>
            </div>
            
            {/* 步骤3: 返回商品 */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                searchStep >= 3 ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {searchStep >= 3 ? (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-gray-400 font-medium text-sm">3</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1">
                  <span className={`text-sm font-medium ${searchStep >= 3 ? 'text-gray-800' : 'text-gray-400'}`}>返回商品</span>
                  <span className="text-sm text-gray-500">
                    {searchStep >= 3 ? '完成' : '等待中'}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-500" 
                    style={{ width: searchStep >= 3 ? '100%' : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 商户列表 */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">
            {searchStep > 0 ? '搜索结果' : '推荐商户'}
          </h3>
          <Link to="/merchants" className="text-sm text-sky-600 hover:underline">查看全部</Link>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : merchants.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🏪</div>
            <p className="text-gray-500">暂无商户</p>
          </div>
        ) : (
          <div className="space-y-3">
            {merchants.map((merchant) => (
              <div key={merchant.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {merchant.logo_url ? (
                    <img src={merchant.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    merchant.name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-gray-800 truncate">{merchant.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {getMerchantTags(merchant).join(' · ')}
                    {merchant.reputation?.transactions && ` · ${merchant.reputation.transactions}笔交易`}
                  </p>
                </div>
                <span className="text-sky-600 flex-shrink-0">→</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 筛选功能 */}
      {!searchStep && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm mt-6 sm:mt-8">
          <h3 className="font-semibold text-gray-800 mb-4">筛选条件</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">分类</p>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium">全部</button>
                <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">电子产品</button>
                <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">服装鞋帽</button>
                <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">食品生鲜</button>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">价格区间</p>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="最低" className="w-20 sm:w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <span className="text-gray-400">-</span>
                <input type="number" placeholder="最高" className="w-20 sm:w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <button className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm">确定</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;