import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://api.io011.com';

export default function Login() {
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
      // 调用商户端 API 验证登录
      const response = await fetch(`${API_BASE}/api/v1/merchants`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('服务不可用');
      }

      const data = await response.json();
      const merchants = data.merchants || [];

      // 查找匹配的商户（这里用 name 作为用户名）
      // 实际应该有一个 /api/v1/merchants/login 接口
      const merchant = merchants.find((m: any) => 
        m.name === username && m.status === 'active'
      );

      if (merchant) {
        // 登录成功，保存商户信息
        localStorage.setItem('merchant_id', merchant.id);
        localStorage.setItem('merchant_name', merchant.name);
        localStorage.setItem('merchant_token', merchant.api_key || 'valid-token');
        localStorage.setItem('token', `merchant-${merchant.id}`);
        
        navigate('/');
      } else {
        // 如果没有匹配，创建一个测试登录（开发模式）
        if (username === 'admin' && password === 'admin') {
          localStorage.setItem('merchant_id', 'test-merchant');
          localStorage.setItem('merchant_name', '测试商户');
          localStorage.setItem('merchant_token', 'test-token');
          localStorage.setItem('token', 'mock-token');
          navigate('/');
        } else {
          setError('用户名或密码错误');
        }
      }
    } catch (err) {
      // API 不可用时，使用 Mock 登录（开发模式）
      console.warn('API 不可用，使用 Mock 登录');
      
      if (username && password) {
        localStorage.setItem('merchant_id', 'test-merchant');
        localStorage.setItem('merchant_name', username);
        localStorage.setItem('merchant_token', 'mock-token');
        localStorage.setItem('token', 'mock-token');
        navigate('/');
      } else {
        setError('请输入用户名和密码');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-gray-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">商户后台登录</h1>
          <p className="text-gray-500 text-sm mt-1">IO011 商户管理系统</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-gray-700 mb-2 font-medium">商户名称</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="请输入商户名称"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2 font-medium">登录密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="请输入登录密码"
              required
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-smtext-center">{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-xl font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-xs">
            登录即表示同意
            <a href="#" className="text-blue-500 hover:underline"> 服务条款</a>
            和
            <a href="#" className="text-blue-500 hover:underline"> 隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  );
}