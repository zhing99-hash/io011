import React, { useState, useEffect } from 'react';
import {
  getTags,
  getPendingTags,
  getPopularTags,
  addTag,
  updateTag,
  deleteTag,
  approveTag,
  rejectTag,
  tagTypeLabels,
  tagTypeColors,
} from '../api/mockTags';
import type { Tag, TagType } from '../api/mockTags';

type TabType = 'category' | 'capability' | 'region' | 'pending' | 'popular';

const Tags: React.FC = () => {
  // 状态管理
  const [activeTab, setActiveTab] = useState<TabType>('category');
  const [tags, setTags] = useState<Tag[]>([]);
  const [pendingTags, setPendingTags] = useState<Tag[]>([]);
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal 状态
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  // Form 状态
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<TagType>('category');

  // 拒绝弹窗
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingTagId, setRejectingTagId] = useState<string>('');
  const [rejectReason, setRejectReason] = useState('');

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const allTags = await getTags();
      const pending = await getPendingTags();
      const popular = await getPopularTags();
      setTags(allTags.filter((t) => t.status === 'approved'));
      setPendingTags(pending);
      setPopularTags(popular);
    } catch (error) {
      console.error('加载标签失败:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // 获取当前标签列表
  const getCurrentTags = (): Tag[] => {
    switch (activeTab) {
      case 'category':
        return tags.filter((t) => t.type === 'category');
      case 'capability':
        return tags.filter((t) => t.type === 'capability');
      case 'region':
        return tags.filter((t) => t.type === 'region');
      case 'pending':
        return pendingTags;
      case 'popular':
        return popularTags;
      default:
        return [];
    }
  };

  // 打开新增弹窗
  const openAddModal = () => {
    setModalMode('add');
    setFormName('');
    setFormType(activeTab === 'pending' ? 'category' : (activeTab as TagType));
    setEditingTag(null);
    setShowModal(true);
  };

  // 打开编辑弹窗
  const openEditModal = (tag: Tag) => {
    setModalMode('edit');
    setFormName(tag.name);
    setFormType(tag.type);
    setEditingTag(tag);
    setShowModal(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!formName.trim()) return;

    try {
      if (modalMode === 'add') {
        await addTag({
          name: formName.trim(),
          type: formType,
          count: 0,
          status: 'approved',
        });
      } else if (editingTag) {
        await updateTag(editingTag.id, {
          name: formName.trim(),
          type: formType,
        });
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  // 删除标签
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个标签吗？')) return;

    try {
      await deleteTag(id);
      loadData();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  // 通过审核
  const handleApprove = async (id: string) => {
    try {
      await approveTag(id);
      loadData();
    } catch (error) {
      console.error('审核通过失败:', error);
    }
  };

  // 拒绝审核
  const handleReject = (id: string) => {
    setRejectingTagId(id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    try {
      await rejectTag(rejectingTagId, rejectReason);
      setShowRejectModal(false);
      loadData();
    } catch (error) {
      console.error('拒绝失败:', error);
    }
  };

  // Tab 配置
  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'category', label: '类目标签', count: tags.filter((t) => t.type === 'category').length },
    { key: 'capability', label: '能力标签', count: tags.filter((t) => t.type === 'capability').length },
    { key: 'region', label: '地区标签', count: tags.filter((t) => t.type === 'region').length },
    { key: 'pending', label: '待审核', count: pendingTags.length },
    { key: 'popular', label: '热门统计' },
  ];

  const currentTags = getCurrentTags();

  return (
    <div className="p-6">
      {/* 标题 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🏪 Hub 中心 - 标签管理</h1>
        {activeTab !== 'popular' && activeTab !== 'pending' && (
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + 新增标签
          </button>
        )}
      </div>

      {/* Tab 导航 */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* 提示信息 */}
      {activeTab === 'popular' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            💡 提示: 热门标签会优先推荐给用户
          </p>
        </div>
      )}

      {/* 加载状态 */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : activeTab === 'popular' ? (
        /* 热门标签统计视图 */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {popularTags.map((tag, index) => (
              <div
                key={tag.id}
                className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4 ${
                    index === 0
                      ? 'bg-yellow-500'
                      : index === 1
                      ? 'bg-gray-400'
                      : index === 2
                      ? 'bg-amber-600'
                      : 'bg-gray-300'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{tag.name}</span>
                    <span
                      className="px-2 py-0.5 rounded text-xs text-white"
                      style={{ backgroundColor: tagTypeColors[tag.type] }}
                    >
                      {tagTypeLabels[tag.type]}
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((tag.count / (popularTags[0]?.count || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <div className="text-xl font-bold text-gray-900">{tag.count}</div>
                  <div className="text-xs text-gray-500">次使用</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'pending' ? (
        /* 待审核视图 */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  标签名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  提交商户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  提交时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentTags.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    暂无待审核标签
                  </td>
                </tr>
              ) : (
                currentTags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{tag.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-2 py-1 rounded text-xs text-white"
                        style={{ backgroundColor: tagTypeColors[tag.type] }}
                      >
                        {tagTypeLabels[tag.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {tag.submitter}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {tag.submitTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleApprove(tag.id)}
                        className="mr-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                      >
                        通过
                      </button>
                      <button
                        onClick={() => handleReject(tag.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        拒绝
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* 系统标签列表视图 */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  标签名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  使用次数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentTags.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    暂无标签
                  </td>
                </tr>
              ) : (
                currentTags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{tag.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="px-2 py-1 rounded text-xs text-white"
                        style={{ backgroundColor: tagTypeColors[tag.type] }}
                      >
                        {tagTypeLabels[tag.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      <div className="flex items-center gap-2">
                        <span>{tag.count}</span>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(
                                (tag.count / (currentTags[0]?.count || 1)) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(tag)}
                        className="mr-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(tag.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{modalMode === 'add' ? '新增标签' : '编辑标签'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标签名称</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入标签名称"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标签类型</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as TagType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="category">类目</option>
                  <option value="capability">能力</option>
                  <option value="region">地区</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {modalMode === 'add' ? '新增' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 拒绝弹窗 */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">拒绝标签</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                拒绝原因（可选）
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
                placeholder="请输入拒绝原因"
              />
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={confirmReject}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tags;