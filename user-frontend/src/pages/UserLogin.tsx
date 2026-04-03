import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

let API_BASE = 'https://api.io011.com/api/v1';

let UserLogin: React.FC = () => {
  let [phone, setPhone] = useState('');
  let [code, setCode] = useState('');
  let [error, setError] = useState('');
  let [loading, setLoading] = useState(false);
  let [codeSent, setCodeSent] = useState(false);
  let [countdown, setCountdown] = useState(0);
  let navigate = useNavigate();

  // 发送验证码
  let sendCode = async () => {
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }
    
    try {
      let res = await fetch(`${API_BASE}/user/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      let data = await res.json();
      
      if (data.success) {
        setCodeSent(true);
        setCountdown(60);
        setError('');
        
        let timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(data.message || '发送失败');
      }
    } catch (err) {
      // 离线模式: 模拟发送
      setCodeSent(true);
      setCountdown(60);
      setError('');
      
      let timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  let handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let res = await fetch(`${API_BASE}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });
      let data = await res.json();
      
      if (data.success) {
        localStorage.setItem('user_id', data.data.user.id);
        localStorage.setItem('user_phone', data.data.user.phone);
        localStorage.setItem('user_nickname', data.data.user.nickname);
        localStorage.setItem('user_token', data.data.token);
        navigate('/');
      } else {
        setError(data.message || '登录失败');
      }
    } catch (err) {
      // 离线模式: 模拟登录（演示用户）
      if (phone === '18600186000' && code === '1234') {
        localStorage.setItem('user_id', 'user-demo-001');
        localStorage.setItem('user_phone', phone);
        localStorage.setItem('user_nickname', '演示用户');
        localStorage.setItem('user_token', 'demo-token');
        navigate('/');
      } else {
        setError('网络错误，请检查网络连接');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* 导航 */}
      <nav className="h-14 sm:h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img 
            src="/logo-blue.png" 
            alt="IO011" 
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl object-contain" 
          />
          <span className="font-bold text-lg sm:text-xl text-gray-800">IO011</span>
        </Link>
        <Link to="/" className="text-sm sm:text-base text-gray-600 hover:text-sky-600 font-medium">
          返回首页
        </Link>
      </nav>

      {/* 登录表单 */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-sky-50 to-white">
        <div className="w-full max-w-sm sm:max-w-md">
          {/* 演示用户提示 */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-700">
            <strong>演示用户：</strong>18600186000  |  验证码：1234
          </div>
          
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 text-center">欢迎回来</h2>
            <p className="text-gray-500 text-sm mb-5 sm:mb-8 text-center">登录您的 IO011 账号</p>

            <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
              {/* 手机号 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 text-left">手机号</label>
                <div className="flex gap-2">
                  <select className="w-16 sm:w-20 px-2 sm:px-3 py-2.5 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-gray-50 text-sm">
                    <option>+86</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm sm:text-base"
                  />
                </div>
              </div>
              
              {/* 验证码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 text-left">验证码</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="请输入验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    onClick={sendCode}
                    disabled={countdown > 0}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl text-sky-600 font-medium hover:bg-sky-50 whitespace-nowrap text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <label className="flex items-start gap-2">
                <input type="checkbox" className="w-4 h-4 mt-0.5 text-sky-500 rounded border-gray-300 focus:ring-sky-500" />
                <span className="text-xs sm:text-sm text-gray-500">我已阅读并同意 <a href="#" className="text-sky-600">服务条款</a> 和 <a href="#" className="text-sky-600">隐私政策</a></span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50 text-sm sm:text-base"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>

            <div className="relative my-4 sm:my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-400">其他登录方式</span>
              </div>
            </div>

            {/* 第三方登录 */}
            <div className="flex justify-center gap-3 sm:gap-4">
              <button className="w-11 h-11 sm:w-14 sm:h-14 bg-gray-50 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              </button>
              <button className="w-11 h-11 sm:w-14 sm:h-14 bg-gray-50 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
              </button>
            </div>

            <p className="mt-5 sm:mt-6 text-center text-sm text-gray-500">
              注册暂不开放，敬请期待
            </p>
          </div>

          <p className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-400">
            © 2026 IO011 用户端 · <a href="#" className="hover:text-gray-600">服务条款</a> · <a href="#" className="hover:text-gray-600">隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;