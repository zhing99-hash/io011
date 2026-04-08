import React, { useState } from 'react';

interface DocSection {
  id: string;
  title: string;
  method?: string;
  path: string;
  content: React.ReactNode;
}

const HubDocs: React.FC = () => {
  const [activeSection, setActiveSection] = useState('intro');

  const sections: DocSection[] = [
    {
      id: 'intro',
      title: '快速开始',
      path: '',
      content: (
        <div>
          <p className="text-gray-600 mb-6">
            IO011 提供 RESTful API，帮助开发者快速接入平台能力。
          </p>
          <h4 className="font-semibold text-gray-800 mb-3">基础 URL</h4>
          <div className="bg-gray-900 rounded-xl p-4 mb-6">
            <code className="text-green-400">https://api.io011.com/api/v1</code>
          </div>
          <h4 className="font-semibold text-gray-800 mb-3">认证方式</h4>
          <p className="text-gray-600 mb-4">
            所有 API 请求需要在 Header 中携带 API Key：
          </p>
          <div className="bg-gray-900 rounded-xl p-4 mb-6">
            <pre className="text-gray-300 text-sm">
{`Authorization: Bearer YOUR_API_KEY`}
            </pre>
          </div>
        </div>
      ),
    },
    {
      id: 'search',
      title: '搜索 API',
      method: 'GET',
      path: '/api/v1/search',
      content: (
        <div>
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">GET</span>
              <code className="text-green-400">/api/v1/search</code>
            </div>
            <p className="text-gray-400 text-sm mb-4">搜索商品和商户</p>
            <h4 className="text-white font-medium mb-2">请求参数</h4>
            <pre className="text-gray-300 text-sm overflow-x-auto">
{`{
  query: "iPhone 15",      // 搜索关键词
  limit: 10,              // 返回数量
  category: "electronics" // 分类筛选(可选)
}`}
            </pre>
          </div>
          <h4 className="font-semibold text-gray-800 mb-3">响应示例</h4>
          <div className="bg-gray-900 rounded-xl p-6">
            <pre className="text-gray-300 text-sm">
{`{
  "success": true,
  "data": {
    "merchants": [...],
    "products": [...],
    "total": 156
  },
  "meta": {
    "took": 234,
    "queried_merchants": 5
  }
}`}
            </pre>
          </div>
        </div>
      ),
    },
    {
      id: 'merchants',
      title: '商户 API',
      method: 'GET',
      path: '/api/v1/merchants',
      content: (
        <div>
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">GET</span>
              <code className="text-green-400">/api/v1/merchants</code>
            </div>
            <p className="text-gray-400 text-sm">获取商户列表</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">GET</span>
              <code className="text-green-400">/api/v1/merchants/:id</code>
            </div>
            <p className="text-gray-400 text-sm">获取商户详情</p>
          </div>
        </div>
      ),
    },
    {
      id: 'auth',
      title: '认证 API',
      method: 'POST',
      path: '/api/v1/auth/login',
      content: (
        <div>
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">POST</span>
              <code className="text-green-400">/api/v1/auth/admin/login</code>
            </div>
            <p className="text-gray-400 text-sm mb-4">管理员登录</p>
            <pre className="text-gray-300 text-sm">
{`// 请求
{
  "username": "admin",
  "password": "admin123"
}

// 响应
{
  "success": true,
  "data": {
    "token": "xxx",
    "user": { "id": "admin-001", "name": "管理员" }
  }
}`}
            </pre>
          </div>
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">POST</span>
              <code className="text-green-400">/api/v1/auth/merchant/login</code>
            </div>
            <p className="text-gray-400 text-sm">商户登录</p>
          </div>
        </div>
      ),
    },
    {
      id: 'orders',
      title: '订单 API',
      method: 'GET',
      path: '/api/v1/orders',
      content: (
        <div>
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">GET</span>
              <code className="text-green-400">/api/v1/orders</code>
            </div>
            <p className="text-gray-400 text-sm">获取订单列表</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">POST</span>
              <code className="text-green-400">/api/v1/orders</code>
            </div>
            <p className="text-gray-400 text-sm">创建订单</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded">PUT</span>
              <code className="text-green-400">/api/v1/orders/:id</code>
            </div>
            <p className="text-gray-400 text-sm">更新订单状态</p>
          </div>
        </div>
      ),
    },
    {
      id: 'products',
      title: '商品 API',
      method: 'GET',
      path: '/api/v1/products',
      content: (
        <div>
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">GET</span>
              <code className="text-green-400">/api/v1/products</code>
            </div>
            <p className="text-gray-400 text-sm">获取商品列表</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">POST</span>
              <code className="text-green-400">/api/v1/products</code>
            </div>
            <p className="text-gray-400 text-sm">创建商品</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">DELETE</span>
              <code className="text-green-400">/api/v1/products/:id</code>
            </div>
            <p className="text-gray-400 text-sm">删除商品</p>
          </div>
        </div>
      ),
    },
    {
      id: 'errors',
      title: '错误码',
      path: '',
      content: (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">错误码</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">说明</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-red-500 font-mono">400</td>
                  <td className="py-3 px-4 text-gray-600">请求参数有误</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-red-500 font-mono">401</td>
                  <td className="py-3 px-4 text-gray-600">未授权或 Token 过期</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-red-500 font-mono">403</td>
                  <td className="py-3 px-4 text-gray-600">没有访问权限</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-red-500 font-mono">404</td>
                  <td className="py-3 px-4 text-gray-600">资源不存在</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-red-500 font-mono">429</td>
                  <td className="py-3 px-4 text-gray-600">请求过于频繁</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-red-500 font-mono">500</td>
                  <td className="py-3 px-4 text-gray-600">服务器内部错误</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div id="docs" className="pt-24 pb-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">API 开发者文档</h1>
          <p className="text-gray-600">IO011 开放接口文档，连接您的业务与平台</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* 左侧目录 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 sticky top-24 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">目录</h3>
              <ul className="space-y-2 text-sm">
                {sections.map((section) => (
                  <li key={section.id}>
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        activeSection === section.id
                          ? 'bg-indigo-50 text-indigo-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {section.method && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          section.method === 'GET' ? 'bg-green-100 text-green-600' :
                          section.method === 'POST' ? 'bg-blue-100 text-blue-600' :
                          section.method === 'PUT' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {section.method}
                        </span>
                      )}
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <a
                  href="https://feishu.cn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  飞书文档 →
                </a>
              </div>
            </div>
          </div>

          {/* 右侧内容 */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              {sections.map((section) => (
                <div key={section.id} id={section.id} className={activeSection === section.id ? 'block' : 'hidden'}>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">{section.title}</h2>
                  {section.content}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HubDocs;