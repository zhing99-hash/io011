import React from 'react';
import { Link } from 'react-router-dom';

const Developing: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">功能开发中</h1>
        <p className="text-gray-500 mb-6">该功能正在紧张开发中，敬请期待...</p>
        <div className="flex justify-center gap-4">
          <Link 
            to="/" 
            className="px-6 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600"
          >
            返回首页
          </Link>
          <Link 
            to="/profile" 
            className="px-6 py-2 border border-gray-200 rounded-lg font-medium hover:border-sky-500"
          >
            返回个人中心
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Developing;