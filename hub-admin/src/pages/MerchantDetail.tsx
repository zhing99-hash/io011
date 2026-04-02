import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMerchantById, updateMerchantStatus } from '../api/mockMerchants';
import type { Merchant, MerchantStatus } from '../api/mockMerchants';

const MerchantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    loadMerchant();
  }, [id]);

  const loadMerchant = async () => {
    if (!id) return;
    setLoading(true);
    const data = await getMerchantById(id);
    setMerchant(data || null);
    setLoading(false);
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 审核通过
  const handleApprove = async () => {
    if (!merchant) return;
    await updateMerchantStatus(merchant.id, 'active');
    loadMerchant();
  };

  // 审核拒绝
  const handleReject = async () => {
    if (!merchant) return;
    await updateMerchantStatus(merchant.id, 'rejected');
    loadMerchant();
  };

  // 状态显示
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Link to="/merchants" className="text-primary hover:underline">
            ← 返回商户列表
          </Link>
        </div>
        <div className="text-center text-gray-500">商户不存在</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link to="/merchants" className="text-primary hover:underline">
          ← 返回商户列表
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* 头部 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start gap-4">
            <img
              src={merchant.logo}
              alt={merchant.name}
              className="w-16 h-16 rounded-lg object-cover bg-gray-100"
            />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h1 className="text-2xl font-bold text-gray-900">{merchant.name}</h1>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusClass(merchant.status)}`}>
                  {getStatusLabel(merchant.status)}
                </span>
              </div>
              <p className="text-gray-500 mt-1">{merchant.description}</p>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* API 配置 */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500 mb-3">API 配置</h3>
            </div>
            <div>
              <h4 className="text-xs text-gray-500 mb-1">Endpoint 地址</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-50 rounded text-sm font-mono text-gray-800 break-all">
                  {merchant.endpoint}
                </code>
                <button
                  onClick={() => copyToClipboard(merchant.endpoint, 'endpoint')}
                  className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 whitespace-nowrap"
                >
                  {copiedField === 'endpoint' ? '✓ 已复制' : '复制'}
                </button>
              </div>
            </div>
            <div>
              <h4 className="text-xs text-gray-500 mb-1">API Key</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-50 rounded text-sm font-mono text-gray-800 break-all">
                  {merchant.apiKey}
                </code>
                <button
                  onClick={() => copyToClipboard(merchant.apiKey, 'apiKey')}
                  className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 whitespace-nowrap"
                >
                  {copiedField === 'apiKey' ? '✓ 已复制' : '复制'}
                </button>
              </div>
            </div>

            {/* 联系方式 */}
            <div className="md:col-span-2 mt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3">联系方式</h3>
            </div>
            <div>
              <h4 className="text-xs text-gray-500 mb-1">联系人</h4>
              <p className="text-gray-900">{merchant.contactName}</p>
            </div>
            <div>
              <h4 className="text-xs text-gray-500 mb-1">联系电话</h4>
              <p className="text-gray-900">{merchant.phone}</p>
            </div>
            <div>
              <h4 className="text-xs text-gray-500 mb-1">邮箱</h4>
              <p className="text-gray-900">{merchant.email}</p>
            </div>
            <div>
              <h4 className="text-xs text-gray-500 mb-1">地址</h4>
              <p className="text-gray-900">{merchant.address}</p>
            </div>

            {/* 商户信息 */}
            <div className="md:col-span-2 mt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3">商户信息</h3>
            </div>
            <div>
              <h4 className="text-xs text-gray-500 mb-1">注册时间</h4>
              <p className="text-gray-900">{merchant.createdAt}</p>
            </div>
            <div>
              <h4 className="text-xs text-gray-500 mb-1">标签</h4>
              <div className="flex gap-2 flex-wrap">
                {merchant.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* 封禁信息 */}
            {merchant.status === 'banned' && merchant.banReason && (
              <>
                <div className="md:col-span-2 mt-4">
                  <h3 className="text-sm font-medium text-red-500 mb-3">封禁信息</h3>
                </div>
                <div>
                  <h4 className="text-xs text-gray-500 mb-1">封禁时间</h4>
                  <p className="text-gray-900">{merchant.bannedAt}</p>
                </div>
                <div className="md:col-span-2">
                  <h4 className="text-xs text-gray-500 mb-1">封禁原因</h4>
                  <p className="text-red-600 bg-red-50 p-3 rounded">{merchant.banReason}</p>
                </div>
              </>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="mt-8 flex gap-3 flex-wrap">
            {/* 待审核状态 - 审核操作 */}
            {merchant.status === 'pending' && (
              <>
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  ✓ 审核通过
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  ✗ 审核拒绝
                </button>
              </>
            )}
            {/* 正常状态 - 显示编辑按钮 */}
            {merchant.status === 'active' && (
              <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">
                编辑
              </button>
            )}
            {/* 已拒绝/已封禁状态 */}
            {(merchant.status === 'rejected' || merchant.status === 'banned') && (
              <button
                onClick={async () => {
                  await updateMerchantStatus(merchant.id, 'active');
                  loadMerchant();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                恢复正常状态
              </button>
            )}
            <Link
              to="/merchants"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              返回
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantDetail;