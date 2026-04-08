import { Link } from 'react-router-dom';

const menuItems = [
  { path: '/', label: '仪表盘', icon: '📊' },
  { path: '/products', label: '商品管理', icon: '📦' },
  { path: '/tags', label: '标签管理', icon: '🏷️' },
  { path: '/orders', label: '订单管理', icon: '🛒' },
  { path: '/analytics', label: '数据分析', icon: '📈' },
];

export default function Layout({ children, activePath }: { children: React.ReactNode; activePath: string }) {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary">商户后台</h1>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`block px-4 py-2 rounded-lg transition-colors ${
                    activePath === item.path
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            退出登录
          </button>
        </div>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}