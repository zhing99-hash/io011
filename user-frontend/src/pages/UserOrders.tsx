import React, { useState, useEffect } from 'react';

interface OrderItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  merchant_id: string;
  merchant_name?: string;
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
  created_at: string;
}

const UserOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // 模拟数据
      const mockOrders: Order[] = [
        {
          id: '1',
          order_number: 'ORD20260403001',
          merchant_id: 'm1',
          merchant_name: '华为官方商城',
          items: [{ product_id: 'p1', product_name: 'HUAWEI Mate 60 Pro', price: 6999, quantity: 1 }],
          total_amount: 6999,
          status: 'completed',
          created_at: '2026-04-02 14:30:00',
        },
        {
          id: '2',
          order_number: 'ORD20260403002',
          merchant_id: 'm2',
          merchant_name: '小米精选',
          items: [{ product_id: 'p2', product_name: '小米手环9', price: 299, quantity: 2 }],
          total_amount: 598,
          status: 'shipped',
          created_at: '2026-04-03 10:15:00',
        },
        {
          id: '3',
          order_number: 'ORD20260403003',
          merchant_id: 'm1',
          merchant_name: '华为官方商城',
          items: [{ product_id: 'p3', product_name: 'FreeBuds Pro 3', price: 1499, quantity: 1 }],
          total_amount: 1499,
          status: 'pending',
          created_at: '2026-04-03 11:20:00',
        },
      ];

      let filtered = mockOrders;
      if (activeTab !== 'all') {
        filtered = mockOrders.filter(o => o.status === activeTab);
      }
      
      setOrders(filtered);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusMap: Record<string, { label: string; className: string }> = {
    pending: { label: '待支付', className: 'bg-yellow-100 text-yellow-600' },
    paid: { label: '已支付', className: 'bg-blue-100 text-blue-600' },
    shipped: { label: '配送中', className: 'bg-purple-100 text-purple-600' },
    delivered: { label: '已送达', className: 'bg-indigo-100 text-indigo-600' },
    completed: { label: '已完成', className: 'bg-green-100 text-green-600' },
    cancelled: { label: '已取消', className: 'bg-gray-100 text-gray-600' },
  };

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待支付' },
    { key: 'paid', label: '待发货' },
    { key: 'shipped', label: '配送中' },
    { key: 'completed', label: '已完成' },
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
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">我的订单</h1>

      {/* 订单标签 */}
      <div className="flex gap-4 border-b border-gray-100 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 订单列表 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-gray-500">暂无订单</p>
          <a href="/" className="text-sky-600 hover:underline mt-2 inline-block">去购物</a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
              {/* 订单头部 */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                <div>
                  <p className="text-sm text-gray-500">{order.merchant_name}</p>
                  <p className="text-xs text-gray-400">{order.order_number}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusMap[order.status]?.className}`}>
                  {statusMap[order.status]?.label}
                </span>
              </div>

              {/* 商品列表 */}
              <div className="space-y-3 mb-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                      📦
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.product_name}</p>
                      <p className="text-sm text-gray-500">x{item.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-800">¥{item.price}</p>
                  </div>
                ))}
              </div>

              {/* 订单底部 */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <p className="text-gray-500 text-sm">{order.created_at}</p>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">合计: ¥{order.total_amount}</span>
                  {order.status === 'pending' && (
                    <button className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium">
                      去支付
                    </button>
                  )}
                  {order.status === 'completed' && (
                    <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium">
                      再次购买
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserOrders;