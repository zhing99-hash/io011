import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

// 预设标签选项
const CATEGORY_OPTIONS = ['茶具', '陶瓷', '手工艺术品', '文房四宝', '书画桌', '定制家具'];
const CAPABILITY_OPTIONS = ['支持定制', '48小时发货', '包邮', '7天无理由退换', '可开发票'];
const REGION_OPTIONS = ['景德镇', '龙泉', '宜兴', '苏州', '杭州', '泉州'];
const PRICE_OPTIONS = [
  { label: '0-50元', min: 0, max: 50 },
  { label: '50-100元', min: 50, max: 100 },
  { label: '100-200元', min: 100, max: 200 },
  { label: '200-500元', min: 200, max: 500 },
  { label: '500-1000元', min: 500, max: 1000 },
  { label: '1000元以上', min: 1000, max: null },
];

interface Tags {
  categories: string[];
  capabilities: string[];
  regions: string[];
  priceRanges: string[];
}

export default function Tags() {
  // 标签状态
  const [tags, setTags] = useState<Tags>({
    categories: [],
    capabilities: [],
    regions: [],
    priceRanges: [],
  });
  
  // 保存状态
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // 加载已有标签（模拟从 API 获取）
  useEffect(() => {
    // 模拟加载已有标签
    const savedTags = localStorage.getItem('merchant_tags');
    if (savedTags) {
      setTags(JSON.parse(savedTags));
    }
  }, []);

  // 切换标签选择
  const toggleTag = (category: keyof Tags, tag: string) => {
    setTags(prev => {
      const current = prev[category];
      const updated = current.includes(tag)
        ? current.filter(t => t !== tag)
        : [...current, tag];
      return { ...prev, [category]: updated };
    });
  };

  // 保存标签
  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    
    // 模拟 API 保存
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 保存到 localStorage（实际项目中应该是 API 调用）
    localStorage.setItem('merchant_tags', JSON.stringify(tags));
    
    setSaving(false);
    setSaveSuccess(true);
    
    // 3秒后隐藏成功提示
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // 渲染标签按钮
  const renderTagButtons = (
    options: string[],
    selected: string[],
    category: keyof Tags
  ) => {
    return (
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              onClick={() => toggleTag(category, option)}
              className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                isSelected
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
              }`}
            >
              {option} {isSelected && '✓'}
            </button>
          );
        })}
      </div>
    );
  };

  // 渲染价格区间按钮
  const renderPriceButtons = () => {
    return (
      <div className="flex flex-wrap gap-2">
        {PRICE_OPTIONS.map(option => {
          const isSelected = tags.priceRanges.includes(option.label);
          return (
            <button
              key={option.label}
              onClick={() => toggleTag('priceRanges', option.label)}
              className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                isSelected
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
              }`}
            >
              {option.label} {isSelected && '✓'}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Layout activePath="/tags">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold">🏪 商户中心 - 标签管理</h2>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-8">
          {/* 3.1 类目标签设置 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">类目标签</h3>
            <p className="text-sm text-gray-500 mb-3">选择您经营的商品类目</p>
            {renderTagButtons(CATEGORY_OPTIONS, tags.categories, 'categories')}
          </div>

          {/* 3.2 能力标签设置 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">能力标签</h3>
            <p className="text-sm text-gray-500 mb-3">选择您提供的服务能力</p>
            {renderTagButtons(CAPABILITY_OPTIONS, tags.capabilities, 'capabilities')}
          </div>

          {/* 3.3 地区标签设置 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">地区标签</h3>
            <p className="text-sm text-gray-500 mb-3">选择您所在的地区</p>
            {renderTagButtons(REGION_OPTIONS, tags.regions, 'regions')}
          </div>

          {/* 3.4 价格区间设置 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">价格区间</h3>
            <p className="text-sm text-gray-500 mb-3">设置您商品的价格区间</p>
            {renderPriceButtons()}
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <span className="text-blue-500 text-xl">💡</span>
            <p className="text-sm text-blue-700">提示: 标签越多，被用户発見的几率越大</p>
          </div>

          {/* 3.5 保存按钮 */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                saving
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`}
            >
              {saving ? '保存中...' : '保存标签'}
            </button>
            
            {saveSuccess && (
              <span className="text-green-600 font-medium animate-pulse">
                ✓ 保存成功！
              </span>
            )}
          </div>
        </div>

        {/* 当前标签汇总 */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-2">当前已选标签：</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>类目标签: {tags.categories.length > 0 ? tags.categories.join('、') : '未选择'}</p>
            <p>能力标签: {tags.capabilities.length > 0 ? tags.capabilities.join('、') : '未选择'}</p>
            <p>地区标签: {tags.regions.length > 0 ? tags.regions.join('、') : '未选择'}</p>
            <p>价格区间: {tags.priceRanges.length > 0 ? tags.priceRanges.join('、') : '未选择'}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}