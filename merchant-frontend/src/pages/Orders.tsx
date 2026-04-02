import { useState, useMemo } from 'react';
import Layout from '../components/Layout';
import { mockOrders, statusMap, updateOrderStatus, type MockOrder } from '../api/mockOrders';
import type { OrderStatus, OrdersFilter } from '../types';

export default function Orders() {
  const [orders, setOrders] = useState<MockOrder[]>(mockOrders);
  const [filter, setFilter] = useState<OrdersFilter>({
    status: 'all',
    timeRange: '7days',
    search: ''
  });
  const [selectedOrder, setSelectedOrder] = useState<MockOrder | null>(null);
  const [showShipModal, setShowShipModal] = useState(false);
  const [shipOrder, setShipOrder] = useState<MockOrder | null>(null);
  const [logisticsCompany, setLogisticsCompany] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  // Filter orders
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter(order => {
      // Status filter
      if (filter.status !== 'all' && order.status !== filter.status) {
        return false;
      }

      // Search filter
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matchId = order.id.toLowerCase().includes(searchLower);
        const matchCustomer = order.customerInfo.name.toLowerCase().includes(searchLower);
        const matchProduct = order.items.some(item => 
          item.productName.toLowerCase().includes(searchLower)
        );
        if (!matchId && !matchCustomer && !matchProduct) {
          return false;
        }
      }

      // Time filter
      const orderDate = new Date(order.date.split(' ')[0]);
      if (filter.timeRange === 'today') {
        const today = new Date(now.toISOString().split('T')[0]);
        return orderDate.getTime() === today.getTime();
      } else if (filter.timeRange === '7days') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return orderDate >= sevenDaysAgo;
      } else if (filter.timeRange === '30days') {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return orderDate >= thirtyDaysAgo;
      }

      return true;
    });
  }, [orders, filter]);

  // Update order status
  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus, logistics?: { company: string; trackingNumber: string }) => {
    const updated = await updateOrderStatus(orderId, newStatus, logistics);
    if (updated) {
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updated);
      }
    }
  };

  // Open ship modal
  const openShipModal = (order: MockOrder) => {
    setShipOrder(order);
    setLogisticsCompany('');
    setTrackingNumber('');
    setShowShipModal(true);
  };

  // Confirm shipment
  const confirmShip = () => {
    if (shipOrder && logisticsCompany && trackingNumber) {
      handleStatusUpdate(shipOrder.id, 'shipped', { company: logisticsCompany, trackingNumber });
      setShowShipModal(false);
      setShipOrder(null);
    }
  };

  // Handle completed
  const handleComplete = (orderId: string) => {
    handleStatusUpdate(orderId, 'completed');
  };

  // Handle cancel
  const handleCancel = (orderId: string) => {
    if (confirm('确定要取消此订单吗？')) {
      handleStatusUpdate(orderId, 'cancelled');
    }
  };

  return (
    <Layout activePath="/orders">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">🏪 订单管理</h2>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">筛选:</span>
            <select
              value={filter.status}
              onChange={e => setFilter(f => ({ ...f, status: e.target.value as OrderStatus | 'all' }))}
              className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部</option>
              <option value="pending">待付款</option>
              <option value="paid">待发货</option>
              <option value="shipped">已发货</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-600">时间:</span>
            <select
              value={filter.timeRange}
              onChange={e => setFilter(f => ({ ...f, timeRange: e.target.value as OrdersFilter['timeRange'] }))}
              className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部</option>
              <option value="today">今天</option>
              <option value="7days">近7天</option>
              <option value="30days">近30天</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-600">搜索:</span>
            <input
              type="text"
              value={filter.search}
              onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
              placeholder="订单号/客户/商品"
              className="border rounded px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <span className="text-sm text-gray-500 ml-auto">
            共 {filteredOrders.length} 条订单
          </span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">订单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">商品</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">客户</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">数量</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">金额</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">下单时间</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    暂无订单数据
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono">{order.id}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="max-w-[200px] truncate">
                        {order.items.map(i => i.productName).join(', ')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{order.customerInfo.name}</td>
                    <td className="px-4 py-3 text-sm">{order.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                    <td className="px-4 py-3 text-sm font-medium">¥{order.total}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusMap[order.status].class}`}>
                        {statusMap[order.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{order.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                        >
                          详情
                        </button>
                        {order.status === 'paid' && (
                          <button
                            onClick={() => openShipModal(order)}
                            className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition"
                          >
                            发货
                          </button>
                        )}
                        {order.status === 'shipped' && (
                          <button
                            onClick={() => handleComplete(order.id)}
                            className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition"
                          >
                            签收
                          </button>
                        )}
                        {(order.status === 'paid' || order.status === 'pending') && (
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition"
                          >
                            取消
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">订单详情</h3>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              {/* Order Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 text-sm">订单号:</span>
                    <span className="ml-2 font-mono">{selectedOrder.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">状态:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${statusMap[selectedOrder.status].class}`}>
                      {statusMap[selectedOrder.status].label}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">下单时间:</span>
                    <span className="ml-2">{selectedOrder.date}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">订单金额:</span>
                    <span className="ml-2 font-bold text-lg">¥{selectedOrder.total}</span>
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-gray-700">📦 商品信息</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">商品名称</th>
                        <th className="px-3 py-2 text-center">数量</th>
                        <th className="px-3 py-2 text-right">单价</th>
                        <th className="px-3 py-2 text-right">小计</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">{item.productName}</td>
                          <td className="px-3 py-2 text-center">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">¥{item.price}</td>
                          <td className="px-3 py-2 text-right">¥{item.price * item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-gray-700">👤 客户信息</h4>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">姓名:</span>
                      <span className="ml-2">{selectedOrder.customerInfo.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">电话:</span>
                      <span className="ml-2">{selectedOrder.customerInfo.phone}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">地址:</span>
                      <span className="ml-2">{selectedOrder.customerInfo.address}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logistics Info */}
              {selectedOrder.logistics && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-gray-700">🚚 物流信息</h4>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">物流公司:</span>
                        <span className="ml-2">{selectedOrder.logistics.company}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">快递单号:</span>
                        <span className="ml-2 font-mono">{selectedOrder.logistics.trackingNumber}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">发货时间:</span>
                        <span className="ml-2">{selectedOrder.logistics.shippedAt}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  关闭
                </button>
                {selectedOrder.status === 'paid' && (
                  <button
                    onClick={() => {
                      openShipModal(selectedOrder);
                      setSelectedOrder(null);
                    }}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                  >
                    发货
                  </button>
                )}
                {selectedOrder.status === 'shipped' && (
                  <button
                    onClick={() => {
                      handleComplete(selectedOrder.id);
                      setSelectedOrder(null);
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                  >
                    确认收货
                  </button>
                )}
                {(selectedOrder.status === 'paid' || selectedOrder.status === 'pending') && (
                  <button
                    onClick={() => {
                      handleCancel(selectedOrder.id);
                      setSelectedOrder(null);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                  >
                    取消订单
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ship Modal */}
      {showShipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShipModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">填写物流信息</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">物流公司</label>
                  <select
                    value={logisticsCompany}
                    onChange={e => setLogisticsCompany(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">请选择物流公司</option>
                    <option value="顺丰速运">顺丰速运</option>
                    <option value="中通快递">中通快递</option>
                    <option value="圆通速递">圆通速递</option>
                    <option value="申通快递">申通快递</option>
                    <option value="韵达快递">韵达快递</option>
                    <option value="极兔速运">极兔速运</option>
                    <option value="京东物流">京东物流</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">快递单号</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    placeholder="请输入快递单号"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowShipModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  取消
                </button>
                <button
                  onClick={confirmShip}
                  disabled={!logisticsCompany || !trackingNumber}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  确认发货
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}