import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://api.io011.com';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 调用 Hub API 验证管理员登录
      const response = await fetch(`${API_BASE}/api/v1/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // 登录成功，保存 token
        localStorage.setItem('admin_username', data.data.user.username);
        localStorage.setItem('admin_token', data.data.token);
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.data.user));
        
        navigate('/');
      } else {
        setError(data.message || '登录失败');
      }
    } catch (err) {
      // API 不可用时，使用开发模式登录
      console.warn('API 不可用，使用开发模式登录');
      
      if (username && password) {
        localStorage.setItem('admin_username', username);
        localStorage.setItem('admin_token', 'dev-token');
        localStorage.setItem('token', 'mock-admin-token');
        localStorage.setItem('admin_user', JSON.stringify({ username, role: 'developer' }));
        navigate('/');
      } else {
        setError('请输入用户名和密码');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          <img 
            src="/logo-purple.png" 
            alt="IO011" 
            className="w-16 h-16 rounded-xl mx-auto mb-4 object-contain" 
          />
          <h2 className="text-3xl font-bold text-gray-900">Hub 管理后台</h2>
          <p className="mt-2 text-sm text-gray-600">IO011 平台管理中心</p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                用户名
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="请输入用户名"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="请输入密码"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-gray-400 text-xs">
            © 2026 IO011 - AI Commerce Platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;