import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

// Logo
const Logo = () => (
  <Link to="/" className="flex items-center gap-2">
    <img 
      src="/logo-blue.png" 
      alt="IO011" 
      className="h-10 w-10 rounded-xl object-contain" 
    />
    <span className="font-bold text-xl text-gray-800">IO011</span>
  </Link>
);

const UserLayout: React.FC = () => {
  const location = useLocation();
  
  // 检查是否在商户列表页
  const isMerchantPage = location.pathname === '/merchants';
  
  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };
  
  // 检查是否在登录页
  const isLoginPage = location.pathname === '/login';
  
  // 首页导航: 只有"首页"和"商户"
  const navLinks = [
    { path: '/', label: '首页', exact: true },
    { path: '/merchants', label: '商户', exact: true },
  ];
  
  if (isLoginPage) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 顶部导航 */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <Logo />
          
          <div className="hidden md:flex items-center gap-6 sm:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-medium transition-colors ${
                  isActive(link.path, link.exact)
                    ? 'text-sky-600'
                    : 'text-gray-600 hover:text-sky-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          
          {/* 空区域，保持居中 */}
          <div className="w-20"></div>
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      {/* 底部 - 商户页不显示 */}
      {!isMerchantPage && (
        <footer className="bg-white border-t border-gray-100 py-6 px-6">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
            <p className="text-sm text-gray-500">© 2026 IO011 用户端</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <a href="https://www.io011.com/docs" target="_blank" rel="noopener noreferrer" className="hover:text-sky-600">帮助中心</a>
              <a href="#" className="hover:text-sky-600">隐私政策</a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default UserLayout;