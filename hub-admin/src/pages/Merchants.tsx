import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMerchants, updateMerchantStatus } from '../api/mockMerchants';
import type { Merchant, MerchantStatus } from '../api/mockMerchants';

const Merchants: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [statusFilter, setStatusFilter] = useState<MerchantStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const pageSize = 10;

  // 加载数据
  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    setLoading(true);
    const data = await getMerchants();
    setMerchants(data);
    setLoading(false);
  };

  // 筛选
  const filteredMerchants = merchants.filter((m) => {
    const matchName = m.name.toLowerCase().includes(searchName.toLowerCase());
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchName && matchStatus;
  });

  // 分页
  const totalPages = Math.ceil(filteredMerchants.length / pageSize);
  const paginatedMerchants = filteredMerchants.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 状态显示映射
  const getStatusLabel = (status: MerchantStatus) => {
    switch (status) {
      case 'pending':
        return '待审核';
      case 'active':
        return '正常';
      case 'rejected':
        return '已拒绝';
      case 'banned':
        return '已封禁';
      default:
        return status;
    }
  };

  const getStatusClass = (status: MerchantStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'banned':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 审核通过
  const handleReject = async (merchant: Merchant) => {
    await updateMerchantStatus(merchant.id, 'rejected');
    loadMerchants();
  };

  // 打开封禁弹窗
  const openBanModal = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setBanReason('');
    setShowBanModal(true);
  };

  // 确认封禁
  const handleBan = async () => {
    if (selectedMerchant && banReason.trim()) {
      await updateMerchantStatus(selectedMerchant.id, 'banned', banReason.trim());
      setShowBanModal(false);
      loadMerchants();
    }
  };

  // 解封
  const handleUnban = async (merchant: Merchant) => {
    await updateMerchantStatus(merchant.id, 'active');
    loadMerchants();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🏪 商户管理</h1>
        <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">
          + 新增商户
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">搜索:</label>
            <input
              type="text"
              placeholder="输入商户名称"
              value={searchName}
              onChange={(e) => {
                setSearchName(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">状态:</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as MerchantStatus | 'all');
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">全部</option>
              <option value="pending">待审核</option>
              <option value="active">正常</option>
              <option value="rejected">已拒绝</option>
              <option value="banned">已封禁</option>
            </select>
          </div>
          <button
            onClick={() => {
              setSearchName('');
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            重置
          </button>
        </div>
      </div>

      {/* 商户列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Logo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    商户名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    标签
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    注册时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedMerchants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      暂无商户数据
                    </td>
                  </tr>
                ) : (
                  paginatedMerchants.map((merchant) => (
                    <tr key={merchant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <img
                          src={merchant.logo}
                          alt={merchant.name}
                          className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/merchants/${merchant.id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {merchant.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1 flex-wrap">
                          {merchant.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {merchant.tags.length > 2 && (
                            <span className="px-2 py-1 text-xs text-gray-500">
                              +{merchant.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(merchant.status)}`}>
                          {getStatusLabel(merchant.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {merchant.createdAt}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {/* 待审核状态 */}
                        {merchant.status === 'pending' && (
                          <>
                            <Link
                              to={`/merchants/${merchant.id}`}
                              className="text-green-600 hover:underline mr-3"
                            >
                              审核
                            </Link>
                            <button
                              onClick={() => handleReject(merchant)}
                              className="text-red-600 hover:underline"
                            >
                              拒绝
                            </button>
                          </>
                        )}
                        {/* 正常状态 - 显示详情和封禁 */}
                        {merchant.status === 'active' && (
                          <>
                            <Link
                              to={`/merchants/${merchant.id}`}
                              className="text-primary hover:underline mr-3"
                            >
                              详情
                            </Link>
                            <button
                              onClick={() => openBanModal(merchant)}
                              className="text-red-600 hover:underline"
                            >
                              封禁
                            </button>
                          </>
                        )}
                        {/* 已拒绝状态 */}
                        {merchant.status === 'rejected' && (
                          <Link
                            to={`/merchants/${merchant.id}`}
                            className="text-gray-600 hover:underline"
                          >
                            查看
                          </Link>
                        )}
                        {/* 已封禁状态 - 显示详情和解封 */}
                        {merchant.status === 'banned' && (
                          <>
                            <Link
                              to={`/merchants/${merchant.id}`}
                              className="text-primary hover:underline mr-3"
                            >
                              详情
                            </Link>
                            <button
                              onClick={() => handleUnban(merchant)}
                              className="text-green-600 hover:underline"
                            >
                              解封
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  共 {filteredMerchants.length} 条记录，第 {currentPage}/{totalPages} 页
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 封禁弹窗 */}
      {showBanModal && selectedMerchant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">确认封禁商户</h3>
            <p className="text-gray-600 mb-4">
              您确定要封禁「{selectedMerchant.name}」吗？
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                封禁原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="请输入封禁原因"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBanModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleBan}
                disabled={!banReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认封禁
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Merchants;