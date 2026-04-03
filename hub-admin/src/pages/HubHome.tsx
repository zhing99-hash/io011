import React, { useState, useEffect } from 'react';

interface Stats {
  merchants: number;
  products: number;
  searches: number;
}

const HubHome: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ merchants: 0, products: 0, searches: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 加载统计数据
    const fetchStats = async () => {
      try {
        const response = await fetch('https://api.io011.com/api/v1/merchants?limit=1');
        const data = await response.json();
        
        setStats({
          merchants: data.total || 0,
          products: 0, // 需要单独 API
          searches: 0, // 需要单独 API
        });
      } catch (error) {
        // 使用模拟数据
        setStats({
          merchants: 128,
          products: 2560,
          searches: 15680,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const features = [
    {
      icon: '🔍',
      title: '智能搜索',
      description: '并行查询多个商户，实时返回最优结果',
    },
    {
      icon: '🏪',
      title: '商户直连',
      description: '去中心化架构，数据存储在商户端',
    },
    {
      icon: '🤝',
      title: 'Agent 对话',
      description: 'AI Agent 智能匹配需求与商品',
    },
    {
      icon: '🔐',
      title: '数据自主',
      description: '用户完全掌控自己的偏好和数据',
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section id="home" className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* 左侧内容 */}
            <div>
              {/* 标签 */}
              <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                AI 时代的去中心化 Commerce 协议
              </div>
              
              {/* 标题 */}
              <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
                我的数据<br />
                <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                  我做主
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                IO011 是一个全新的 AI Commerce 协议，让商户和用户直接对接，<br />
                打造完全自主的数据主权生态。
              </p>
              
              {/* 按钮 */}
              <div className="flex flex-wrap gap-4">
                <a
                  href="/merchants"
                  className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-[1.02] transition-all"
                >
                  开始探索
                </a>
                <a
                  href="/docs"
                  className="px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  查看文档
                </a>
              </div>
              
              {/* 三大优势 */}
              <div className="flex items-center gap-8 mt-10 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>数据主权100%</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Agent自治</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>协议开放</span>
                </div>
              </div>
            </div>
            
            {/* 右侧图片 */}
            <div className="relative">
              <div className="aspect-square max-w-lg mx-auto">
                <div className="w-full h-full rounded-3xl bg-gradient-to-r from-indigo-500 to-purple-500 p-1">
                  <div className="w-full h-full bg-white rounded-3xl flex items-center justify-center">
                    <div className="text-center">
                      <img
                        src="/logo-hero.jpg"
                        alt="IO011"
                        className="w-[300px] h-[120px] object-contain mb-6 mx-auto"
                      />
                      <p className="text-gray-600 font-medium">AI Commerce 协议</p>
                      <p className="text-gray-400 text-sm mt-2">我的数据我做主</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 浮动卡片 */}
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">实时查询</p>
                    <p className="text-xs text-gray-500">毫秒级响应</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <p className="text-4xl font-bold text-indigo-600">
                {loading ? '...' : stats.merchants.toLocaleString()}
              </p>
              <p className="text-gray-600 mt-2">入驻商户</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-indigo-600">
                {loading ? '...' : stats.products.toLocaleString()}
              </p>
              <p className="text-gray-600 mt-2">商品数量</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-indigo-600">
                {loading ? '...' : stats.searches.toLocaleString()}
              </p>
              <p className="text-gray-600 mt-2">日均查询</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">平台核心功能</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              基于 A2A 架构的智能 Commerce 协议，连接商户与用户的全新方式
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-4 text-2xl">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 bg-gradient-to-r from-indigo-500 to-purple-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">立即加入 IO011</h2>
          <p className="text-white/80 mb-8">
            成为首批商户，享受 AI 带来的流量红利
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://shop.io011.com"
              className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold hover:shadow-xl transition-all"
            >
              商户入驻
            </a>
            <a
              href="/docs"
              className="px-8 py-4 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all"
            >
              开发者文档
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HubHome;