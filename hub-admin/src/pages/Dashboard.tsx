import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  getAnalyticsData,
  type AnalyticsData,
} from '../api/mockAnalytics';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const analyticsData = await getAnalyticsData();
      setData(analyticsData);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { overview, searchTrends, merchantGrowth, merchantStatus, hotKeywords, recentActiveMerchants } = data;

  // 搜索趋势数据（转换为数字格式）
  const searchChartData = searchTrends.map(item => ({
    ...item,
    searches: Number(item.searches),
  }));

  // 商户增长数据
  const growthChartData = merchantGrowth.map(item => ({
    ...item,
    newMerchants: Number(item.newMerchants),
    totalMerchants: Number(item.totalMerchants),
  }));

  // 自定义饼图颜色
  const COLORS = merchantStatus.map(s => s.color);

  return (
    <div className="p-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🏪 Hub 中心 - 数据统计</h1>
        <select className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option>今天</option>
          <option>最近7天</option>
          <option>最近30天</option>
        </select>
      </div>

      {/* 4.1 平台概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="总商户"
          value={overview.totalMerchants}
          icon="🏪"
          color="bg-blue-50"
        />
        <StatCard
          label="今日搜索"
          value={overview.todaySearches}
          icon="🔍"
          color="bg-green-50"
        />
        <StatCard
          label="活跃商户"
          value={overview.activeMerchants}
          icon="✅"
          color="bg-purple-50"
        />
        <StatCard
          label="查询成功率"
          value={`${overview.searchSuccessRate}%`}
          icon="📊"
          color="bg-orange-50"
          isPercentage
        />
      </div>

      {/* 4.4 数据图表 - 搜索趋势 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">搜索趋势 (近7天)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={searchChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="searches"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                name="搜索次数"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4.4 数据图表 - 商户增长趋势 & 商户状态分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 商户增长趋势 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">商户增长趋势</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="newMerchants" fill="#8b5cf6" name="新增商户" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 商户状态分布 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">商户状态分布</h2>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={merchantStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {merchantStatus.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${value} 家`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* 图例 */}
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {merchantStatus.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></span>
                <span className="text-sm text-gray-600">{item.name} {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4.2 查询统计 - 热门搜索词 & 4.3 商户活跃度 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 热门搜索词 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">热门搜索词 Top 5</h2>
          <div className="space-y-3">
            {hotKeywords.map((keyword, index) => (
              <div key={keyword.keyword} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-100 text-gray-700' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  {index + 1}
                </span>
                <span className="flex-1 text-gray-700 font-medium">{keyword.keyword}</span>
                <span className="text-gray-500 text-sm">{keyword.count} 次</span>
              </div>
            ))}
          </div>
        </div>

        {/* 商户活跃度 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">商户活跃度</h2>
          
          {/* 在线/离线统计 */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{overview.onlineMerchants}</p>
              <p className="text-sm text-green-700">在线商户</p>
            </div>
            <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-600">{overview.offlineMerchants}</p>
              <p className="text-sm text-gray-700">离线商户</p>
            </div>
          </div>

          {/* 最近活跃商户列表 */}
          <h3 className="text-sm font-medium text-gray-700 mb-3">最近活跃商户</h3>
          <div className="space-y-2">
            {recentActiveMerchants.map((merchant) => (
              <div key={merchant.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-gray-700">{merchant.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">{merchant.lastActive}</span>
                  <span className="text-xs text-gray-400">{merchant.responseTime}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// 统计卡片组件
interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  isPercentage?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, isPercentage }) => {
  const displayValue = typeof value === 'number' && !isPercentage 
    ? value.toLocaleString() 
    : value;

  return (
    <div className={`${color} rounded-lg p-4 border border-gray-100`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{displayValue}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
};

export default Dashboard;