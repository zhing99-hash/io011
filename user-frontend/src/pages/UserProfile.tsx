import React from 'react';
import { Link } from 'react-router-dom';

const UserProfile: React.FC = () => {
  const userId = localStorage.getItem('user_id');
  const nickname = localStorage.getItem('user_nickname') || '用户';
  const phone = localStorage.getItem('user_phone') || '';

  // 显示手机号中间4位
  const displayPhone = phone ? phone.slice(0, 3) + '****' + phone.slice(7) : '未绑定';

  // 需要跳转到开发中页面的菜单
  const developingItems = [
    { icon: '❤️', label: '收藏夹', path: '/developing' },
    { icon: '🕐', label: '浏览历史', path: '/developing' },
    { icon: '📍', label: '收货地址', path: '/developing' },
    { icon: '💳', label: '支付方式', path: '/developing' },
    { icon: '🔔', label: '消息通知', path: '/developing' },
    { icon: '⚙️', label: '设置', path: '/developing' },
    { icon: '❓', label: '帮助中心', path: 'https://www.io011.com/docs' },
  ];

  const stats = [
    { label: '待付款', value: 0 },
    { label: '待发货', value: 0 },
    { label: '待收货', value: 0 },
    { label: '已完成', value: 0 },
  ];

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">请先登录</p>
          <a href="/login" className="text-sky-600 hover:underline">去登录</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 用户信息头部 */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-500 text-white p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl sm:text-3xl">
            👤
          </div>
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-bold">{nickname}</h2>
            <p className="text-white/80 text-sm">{displayPhone}</p>
          </div>
          <button className="px-3 sm:px-4 py-2 bg-white/20 rounded-lg text-sm font-medium">
            编辑资料
          </button>
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-5 sm:mt-6">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
              <p className="text-white/80 text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 功能菜单 */}
      <div className="p-4 sm:p-6">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {/* 订单入口 */}
          <Link
            to="/orders"
            className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📦</span>
              <span className="font-medium text-gray-800">我的订单</span>
            </div>
            <span className="text-gray-400">→</span>
          </Link>

          {/* 功能开发中 */}
          {developingItems.map((item, idx) => (
            <div key={idx}>
              {item.path.startsWith('http') ? (
                <a
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium text-gray-800">{item.label}</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </a>
              ) : (
                <Link
                  to={item.path}
                  className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium text-gray-800">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">开发中</span>
                    <span className="text-gray-400">→</span>
                  </div>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 退出登录 */}
      <div className="p-4 sm:p-6 pt-0">
        <button
          onClick={() => {
            localStorage.clear();
            window.location.href = '/';
          }}
          className="w-full py-3 bg-white rounded-2xl text-red-500 font-medium shadow-sm hover:bg-gray-50"
        >
          退出登录
        </button>
      </div>

      {/* 开发中提示 */}
      <div className="px-6 pb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-amber-700 text-sm">
            🚧 大部分功能正在紧张开发中，敬请期待...
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;