import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

// Logo
const Logo = () => (
  <Link to="/" className="flex items-center gap-2">
    <img 
      src="/logo-purple.png" 
      alt="IO011" 
      className="h-10 w-10 rounded-xl object-contain" 
    />
    <span className="font-bold text-xl text-gray-800">IO011</span>
  </Link>
);

const navLinks = [
  { path: '/', label: '首页', exact: true },
  { path: '/merchants', label: '商家列表' },
  { path: '/docs', label: 'API文档' },
];

const bottomLinks = [
  { path: '/', label: '首页' },
  { path: '/merchants', label: '商家列表' },
  { path: '/docs', label: 'API文档' },
  { href: 'https://github.com/zhing99-hash/io011', label: 'GitHub' },
  { href: 'https://feishu.cn', label: '飞书' },
];

const HubLayout: React.FC = () => {
  const location = useLocation();
  
  // 判断是否在当前页面
  const isActive = (path: string, exact = false, anchor?: string) => {
    if (anchor) return location.pathname === path;
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 顶部导航 */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <Logo />
          
          {/* 导航链接 */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-medium transition-colors ${
                  isActive(link.path, link.exact)
                    ? 'text-indigo-600'
                    : 'text-gray-600 hover:text-indigo-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          
          {/* 右侧链接 + 按钮 */}
          <div className="flex items-center gap-3">
            <a 
              href="https://shop.io011.com" 
              className="text-gray-600 hover:text-indigo-600 font-medium"
            >
              商户端
            </a>
            <a 
              href="https://user.io011.com" 
              className="text-gray-600 hover:text-indigo-600 font-medium"
            >
              用户端
            </a>
            <a
              href="/merchants"
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              立即体验 →
            </a>
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      {/* 底部信息 */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img 
                  src="/logo-purple.png" 
                  alt="IO011" 
                  className="h-8 w-8 rounded-lg object-contain" 
                />
                <span className="text-white font-bold">IO011</span>
              </div>
              <p className="text-sm">AI 时代的去中心化 Commerce 协议</p>
              <p className="text-sm mt-2">我的数据我做主</p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">产品</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="hover:text-white">展示中心</Link></li>
                <li><a href="https://shop.io011.com" className="hover:text-white">商户端</a></li>
                <li><a href="https://user.io011.com" className="hover:text-white">用户端</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">资源</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/docs" className="hover:text-white">API 文档</Link></li>
                <li><a href="https://github.com/zhing99-hash/io011" target="_blank" className="hover:text-white">GitHub</a></li>
                <li><a href="https://feishu.cn" target="_blank" className="hover:text-white">飞书</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">联系我们</h4>
              <ul className="space-y-2 text-sm">
                <li>邮箱: hello@io011.com</li>
                <li>地址: 中国·北京</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 flex flex-wrap justify-between items-center gap-4">
            <p className="text-sm">© 2026 IO011. All rights reserved.</p>
            <div className="flex items-center gap-4 text-sm">
              {bottomLinks.map((link, idx) => (
                link.href ? (
                  <a key={idx} href={link.href} target="_blank" className="hover:text-white">{link.label}</a>
                ) : link.path ? (
                  <Link key={idx} to={link.path} className="hover:text-white">{link.label}</Link>
                ) : null
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HubLayout;