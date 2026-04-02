import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getVisitData, getProductViews, getSalesData, getCategoryDistribution, getAnalyticsSummary } from '../api/mockAnalytics';
import type { DailyVisit, ProductView, SalesData } from '../api/mockAnalytics';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [visitData, setVisitData] = useState<DailyVisit[]>([]);
  const [productViews, setProductViews] = useState<ProductView[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [categoryDist, setCategoryDist] = useState<{ name: string; value: number; color: string }[]>([]);
  const [summary, setSummary] = useState<{
    totalVisits: number;
    todayVisits: number;
    totalRevenue: number;
    todayRevenue: number;
    weekRevenue: number;
    monthRevenue: number;
    totalOrders: number;
    todayOrders: number;
    weekOrders: number;
    monthOrders: number;
    avgOrderValue: number;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [visits, products, sales, categories, sum] = await Promise.all([
        getVisitData(),
        getProductViews(),
        getSalesData(),
        getCategoryDistribution(),
        getAnalyticsSummary()
      ]);
      setVisitData(visits);
      setProductViews(products);
      setSalesData(sales);
      setCategoryDist(categories);
      setSummary(sum);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading || !summary) {
    return (
      <Layout activePath="/analytics">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </Layout>
    );
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Calculate max for chart scaling
  const maxVisit = Math.max(...visitData.map(d => d.count));
  const maxSales = Math.max(...salesData.map(d => d.revenue));

  return (
    <Layout activePath="/analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">📊 数据分析</h2>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-blue-500">
            <div className="text-gray-500 text-sm">总访问量</div>
            <div className="text-2xl font-bold text-gray-800">{summary.totalVisits.toLocaleString()}</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-green-500">
            <div className="text-gray-500 text-sm">总销售额</div>
            <div className="text-2xl font-bold text-gray-800">¥{summary.totalRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-purple-500">
            <div className="text-gray-500 text-sm">总订单数</div>
            <div className="text-2xl font-bold text-gray-800">{summary.totalOrders}</div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-orange-500">
            <div className="text-gray-500 text-sm">客单价</div>
            <div className="text-2xl font-bold text-gray-800">¥{summary.avgOrderValue}</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visit Trend - Line Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-4">访问趋势 (近7天)</h3>
            <div className="h-48 flex items-end justify-around space-x-1">
              {visitData.map((item, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div
                    className="bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                    style={{ 
                      height: `${(item.count / maxVisit) * 150}px`, 
                      width: '80%',
                      minHeight: '8px'
                    }}
                    title={`${item.count}次访问`}
                  />
                  <span className="text-xs text-gray-500 mt-2">{formatDate(item.date)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center text-gray-500 text-sm">
              今日访问: <span className="font-semibold text-blue-600">{summary.todayVisits}</span> 次
            </div>
          </div>

          {/* Sales Trend - Line Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-4">销售趋势 (近7天)</h3>
            <div className="h-48 flex items-end justify-around space-x-1">
              {salesData.map((item, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div
                    className="bg-green-500 rounded-t transition-all duration-300 hover:bg-green-600"
                    style={{ 
                      height: `${(item.revenue / maxSales) * 150}px`, 
                      width: '80%',
                      minHeight: '8px'
                    }}
                    title={`¥${item.revenue}`}
                  />
                  <span className="text-xs text-gray-500 mt-2">{formatDate(item.date)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center text-gray-500 text-sm">
              今日销售: <span className="font-semibold text-green-600">¥{summary.todayRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Sales Statistics */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="font-semibold mb-4">销售统计</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-gray-500 text-sm mb-1">今日</div>
              <div className="text-xl font-bold text-green-600">¥{summary.todayRevenue.toLocaleString()}</div>
              <div className="text-xs text-gray-400">{summary.todayOrders} 笔订单</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-gray-500 text-sm mb-1">本周</div>
              <div className="text-xl font-bold text-green-600">¥{summary.weekRevenue.toLocaleString()}</div>
              <div className="text-xs text-gray-400">{summary.weekOrders} 笔订单</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-gray-500 text-sm mb-1">本月</div>
              <div className="text-xl font-bold text-green-600">¥{summary.monthRevenue.toLocaleString()}</div>
              <div className="text-xs text-gray-400">{summary.monthOrders} 笔订单</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-gray-500 text-sm mb-1">客单价</div>
              <div className="text-xl font-bold text-orange-600">¥{summary.avgOrderValue}</div>
              <div className="text-xs text-gray-400">平均每笔</div>
            </div>
          </div>
        </div>

        {/* Category Pie Chart & Product Views */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution - Pie Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-4">商品分类占比</h3>
            <div className="flex items-center justify-around">
              {/* Simple Pie Chart */}
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {categoryDist.map((item, i) => {
                    let offset = 0;
                    for (let j = 0; j < i; j++) {
                      offset += categoryDist[j].value;
                    }
                    const dashArray = `${item.value} ${100 - item.value}`;
                    return (
                      <circle
                        key={i}
                        cx="18"
                        cy="18"
                        r="15.9"
                        fill="transparent"
                        stroke={item.color}
                        strokeWidth="4"
                        strokeDasharray={dashArray}
                        strokeDashoffset={-offset}
                      />
                    );
                  })}
                </svg>
              </div>
              {/* Legend */}
              <div className="space-y-2">
                {categoryDist.map((item, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600">{item.name}</span>
                    <span className="text-sm font-semibold">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Product Views - Top 10 */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-4">热门商品 Top 10</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {productViews.slice(0, 10).map((item, i) => (
                <div key={item.productId} className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {i + 1}
                  </div>
                  {item.image && (
                    <img 
                      src={item.image} 
                      alt={item.productName}
                      className="w-8 h-8 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.productName}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-semibold text-blue-600">{item.views}</span> 次浏览
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sales Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="font-semibold mb-4">销售对比 (近7天)</h3>
          <div className="h-48 flex items-end justify-around space-x-1">
            {salesData.map((item, i) => (
              <div key={i} className="flex flex-col items-center flex-1">
                <div className="w-full flex flex-col items-center">
                  <div 
                    className="bg-gradient-to-t from-green-600 to-green-400 rounded-t w-full max-w-12"
                    style={{ height: `${(item.revenue / maxSales) * 140}px`, minHeight: '8px' }}
                    title={`¥${item.revenue}`}
                  />
                  <div className="text-xs text-gray-600 mt-1 font-medium">¥{(item.revenue / 1000).toFixed(1)}k</div>
                </div>
                <span className="text-xs text-gray-500 mt-1">{formatDate(item.date)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}