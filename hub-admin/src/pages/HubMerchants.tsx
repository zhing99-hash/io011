import React, { useState, useEffect } from 'react';

interface Merchant {
  id: string;
  name: string;
  logo_url?: string;
  endpoint: string;
  tags: string[];
  status: string;
  reputation: {
    score: number;
    total_transactions: number;
  };
  created_at: string;
}

const HubMerchants: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('default');

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      const response = await fetch('https://api.io011.com/api/v1/merchants?limit=50');
      const data = await response.json();
      setMerchants(data.merchants || []);
    } catch (error) {
      // 模拟数据
      setMerchants([
        {
          id: 'm1',
          name: '华为官方商城',
          logo_url: '',
          endpoint: 'https://huawei.example.com',
          tags: ['电子产品', '官方直营'],
          status: 'active',
          reputation: { score: 4.9, total_transactions: 1280 },
          created_at: '2026-01-15',
        },
        {
          id: 'm2',
          name: '小米精选',
          logo_url: '',
          endpoint: 'https://mi.example.com',
          tags: ['智能家居', '官方授权'],
          status: 'active',
          reputation: { score: 4.8, total_transactions: 2560 },
          created_at: '2026-01-20',
        },
        {
          id: 'm3',
          name: '优衣库官方',
          logo_url: '',
          endpoint: 'https://uniqlo.example.com',
          tags: ['服装服饰', '官方直营'],
          status: 'active',
          reputation: { score: 4.7, total_transactions: 890 },
          created_at: '2026-02-01',
        },
        {
          id: 'm4',
          name: '苹果官方旗舰店',
          logo_url: '',
          endpoint: 'https://apple.example.com',
          tags: ['电子产品', '官方直营'],
          status: 'active',
          reputation: { score: 5.0, total_transactions: 3200 },
          created_at: '2026-01-10',
        },
        {
          id: 'm5',
          name: '京东自营',
          logo_url: '',
          endpoint: 'https://jd.example.com',
          tags: ['综合电商', '官方授权'],
          status: 'active',
          reputation: { score: 4.6, total_transactions: 8900 },
          created_at: '2026-01-05',
        },
        {
          id: 'm6',
          name: '耐克官方',
          logo_url: '',
          endpoint: 'https://nike.example.com',
          tags: ['运动服饰', '官方直营'],
          status: 'active',
          reputation: { score: 4.8, total_transactions: 1560 },
          created_at: '2026-02-10',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 获取 tags 数组，安全处理
  const getTags = (merchant: Merchant) => {
    if (!merchant.tags) return [];
    if (typeof merchant.tags === 'string') return [merchant.tags];
    if (Array.isArray(merchant.tags)) return merchant.tags;
    return [];
  };

  // 筛选商户
  const filteredMerchants = merchants.filter((merchant) => {
    const tags = getTags(merchant);
    const matchesSearch = merchant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !selectedCategory || tags.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // 排序
  const sortedMerchants = [...filteredMerchants].sort((a, b) => {
    if (sortBy === 'sales') return b.reputation.total_transactions - a.reputation.total_transactions;
    if (sortBy === 'rating') return b.reputation.score - a.reputation.score;
    return 0;
  });

  // 获取首字母作为头像
  const getInitial = (name: string) => name.charAt(0);

  // 头像颜色
  const avatarColors = [
    'from-blue-400 to-blue-600',
    'from-green-400 to-green-600',
    'from-orange-400 to-red-500',
    'from-purple-400 to-purple-600',
    'from-pink-400 to-rose-500',
    'from-teal-400 to-teal-600',
  ];

  const getAvatarColor = (id: string) => {
    const index = id.charCodeAt(0) % avatarColors.length;
    return avatarColors[index];
  };

  const categories = ['电子产品', '服装服饰', '智能家居', '食品生鲜', '运动服饰', '综合电商'];

  return (
    <div id="merchants" className="pt-24 pb-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">优质商户列表</h1>
          <p className="text-gray-600">已入驻 IO011 平台的优质商户</p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <div className="flex flex-wrap gap-4">
            <input
              type="text"
              placeholder="搜索商户..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">全部分类</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="default">综合排序</option>
              <option value="sales">销量优先</option>
              <option value="rating">评分优先</option>
            </select>
          </div>
        </div>

        {/* Merchant Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 mt-4">加载中...</p>
          </div>
        ) : sortedMerchants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无商户</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {sortedMerchants.map((merchant) => (
              <div
                key={merchant.id}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-100"
              >
                {/* Logo / Avatar */}
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getAvatarColor(
                      merchant.id
                    )} flex items-center justify-center text-white text-xl font-bold`}
                  >
                    {merchant.logo_url ? (
                      <img
                        src={merchant.logo_url}
                        alt={merchant.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      getInitial(merchant.name)
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{merchant.name}</h3>
                    {/* 使用 getTags 安全获取标签 */}
                <p className="text-sm text-gray-500">
                  {getTags(merchant).slice(0, 2).join(' · ')}
                </p>
                  </div>
                  {merchant.status === 'active' && (
                    <span className="px-2 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-full">
                      已认证
                    </span>
                  )}
                </div>

                {/* Tags - 使用 getTags 安全获取 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {getTags(merchant).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    交易: {merchant.reputation.total_transactions.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="text-gray-700 font-medium">
                      {merchant.reputation.score}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <a
                    href={`https://shop.io011.com/store/${merchant.id}`}
                    className="text-indigo-600 font-medium hover:text-indigo-700"
                  >
                    进入店铺 →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {sortedMerchants.length > 0 && (
          <div className="flex justify-center gap-2">
            <button className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600">
              上一页
            </button>
            <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg">1</button>
            <button className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600">2</button>
            <button className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600">3</button>
            <button className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600">
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HubMerchants;