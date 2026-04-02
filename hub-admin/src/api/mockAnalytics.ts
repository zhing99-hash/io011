// 统计数据类型定义
export interface OverviewStats {
  totalMerchants: number;
  activeMerchants: number;
  todaySearches: number;
  searchSuccessRate: number;
  onlineMerchants: number;
  offlineMerchants: number;
}

export interface SearchTrend {
  date: string;
  searches: number;
}

export interface MerchantGrowth {
  date: string;
  newMerchants: number;
  totalMerchants: number;
}

export interface MerchantStatusData {
  name: string;
  value: number;
  color: string;
}

export interface HotSearchKeyword {
  keyword: string;
  count: number;
}

export interface RecentActiveMerchant {
  id: string;
  name: string;
  lastActive: string;
  responseTime: number;
}

export interface AnalyticsData {
  overview: OverviewStats;
  searchTrends: SearchTrend[];
  merchantGrowth: MerchantGrowth[];
  merchantStatus: MerchantStatusData[];
  hotKeywords: HotSearchKeyword[];
  recentActiveMerchants: RecentActiveMerchant[];
}

// 生成过去7天的日期
const getPast7Days = (): string[] => {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0].slice(5)); // MM-DD格式
  }
  return dates;
};

// Mock统计数据
const dates = getPast7Days();

export const mockAnalyticsData: AnalyticsData = {
  overview: {
    totalMerchants: 156,
    activeMerchants: 89,
    todaySearches: 1234,
    searchSuccessRate: 98.5,
    onlineMerchants: 72,
    offlineMerchants: 84,
  },
  searchTrends: [
    { date: dates[0], searches: 890 },
    { date: dates[1], searches: 1020 },
    { date: dates[2], searches: 1150 },
    { date: dates[3], searches: 980 },
    { date: dates[4], searches: 1340 },
    { date: dates[5], searches: 1180 },
    { date: dates[6], searches: 1234 },
  ],
  merchantGrowth: [
    { date: dates[0], newMerchants: 3, totalMerchants: 145 },
    { date: dates[1], newMerchants: 5, totalMerchants: 148 },
    { date: dates[2], newMerchants: 2, totalMerchants: 150 },
    { date: dates[3], newMerchants: 4, totalMerchants: 152 },
    { date: dates[4], newMerchants: 1, totalMerchants: 153 },
    { date: dates[5], newMerchants: 2, totalMerchants: 155 },
    { date: dates[6], newMerchants: 1, totalMerchants: 156 },
  ],
  merchantStatus: [
    { name: '正常', value: 120, color: '#22c55e' },
    { name: '待审核', value: 15, color: '#f59e0b' },
    { name: '已封禁', value: 8, color: '#ef4444' },
    { name: '已拒绝', value: 13, color: '#6b7280' },
  ],
  hotKeywords: [
    { keyword: '茶具', count: 234 },
    { keyword: '陶瓷', count: 189 },
    { keyword: '手工品', count: 156 },
    { keyword: '紫砂壶', count: 132 },
    { keyword: '刺绣', count: 98 },
  ],
  recentActiveMerchants: [
    { id: '1', name: '茶韵轩', lastActive: '2分钟前', responseTime: 120 },
    { id: '4', name: '墨香书店', lastActive: '5分钟前', responseTime: 145 },
    { id: '5', name: '竹韵居', lastActive: '8分钟前', responseTime: 98 },
    { id: '8', name: '紫砂堂', lastActive: '12分钟前', responseTime: 156 },
    { id: '2', name: '手作工坊', lastActive: '15分钟前', responseTime: 203 },
  ],
};

// API函数
export const getAnalyticsData = async (): Promise<AnalyticsData> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { ...mockAnalyticsData };
};

export const getOverviewStats = async (): Promise<OverviewStats> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return { ...mockAnalyticsData.overview };
};

export const getSearchTrends = async (): Promise<SearchTrend[]> => {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return [...mockAnalyticsData.searchTrends];
};

export const getMerchantGrowth = async (): Promise<MerchantGrowth[]> => {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return [...mockAnalyticsData.merchantGrowth];
};

export const getMerchantStatus = async (): Promise<MerchantStatusData[]> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return [...mockAnalyticsData.merchantStatus];
};

export const getHotKeywords = async (): Promise<HotSearchKeyword[]> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return [...mockAnalyticsData.hotKeywords];
};

export const getRecentActiveMerchants = async (): Promise<RecentActiveMerchant[]> => {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return [...mockAnalyticsData.recentActiveMerchants];
};