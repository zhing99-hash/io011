import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
  const location = useLocation();
  const [username] = useState('管理员');

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/merchants', label: '商户管理', icon: '🏪' },
    { path: '/tags', label: '标签管理', icon: '🏷️' },
    { path: '/settings', label: '系统设置', icon: '⚙️' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">H</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">Hub Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{username}</span>
            <button className="text-sm text-gray-500 hover:text-gray-700">
              退出
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* 左侧菜单 */}
        <aside className="w-56 bg-white border-r border-gray-200">
          <nav className="p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      isActive(item.path)
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* 右侧内容区 */}
        <main className="flex-1 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;