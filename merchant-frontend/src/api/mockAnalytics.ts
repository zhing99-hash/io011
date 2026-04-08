// Analytics Types
export interface DailyVisit {
  date: string;
  count: number;
}

export interface ProductView {
  productId: number;
  productName: string;
  views: number;
  image?: string;
}

export interface SalesData {
  date: string;
  orders: number;
  revenue: number;
}

export interface AnalyticsSummary {
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
}

// Generate last 7 days dates
function getLast7Days(): string[] {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

// Mock visit data - last 7 days
export const mockVisitData: DailyVisit[] = getLast7Days().map((date, index) => ({
  date,
  count: Math.floor(Math.random() * 300) + 100 + (index * 20)
}));

// Mock product view data
export const mockProductViews: ProductView[] = [
  { productId: 1, productName: '精品茶具套装', views: 234, image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=100&h=100&fit=crop' },
  { productId: 9, productName: '陶瓷花瓶', views: 189, image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=100&h=100&fit=crop' },
  { productId: 2, productName: '紫砂壶功夫茶具', views: 156, image: 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=100&h=100&fit=crop' },
  { productId: 3, productName: '木质收纳柜', views: 142, image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=100&h=100&fit=crop' },
  { productId: 4, productName: '景德镇陶瓷杯', views: 128, image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=100&h=100&fit=crop' },
  { productId: 7, productName: '竹编工艺品', views: 98, image: 'https://images.unsplash.com/photo-1605218427368-351816b936e5?w=100&h=100&fit=crop' },
  { productId: 6, productName: '刺绣抱枕', views: 87, image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=100&h=100&fit=crop' },
  { productId: 10, productName: '手工编织坐垫', views: 76, image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=100&h=100&fit=crop' },
  { productId: 9, productName: '丝绸桌旗', views: 65, image: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=100&h=100&fit=crop' },
  { productId: 5, productName: '复古台灯', views: 54, image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=100&h=100&fit=crop' },
];

// Mock sales data - last 7 days
export const mockSalesData: SalesData[] = getLast7Days().map((date, index) => ({
  date,
  orders: Math.floor(Math.random() * 15) + 5 + index,
  revenue: Math.floor(Math.random() * 2000) + 800 + (index * 150)
}));

// Category distribution for pie chart
export const mockCategoryDistribution = [
  { name: '茶具', value: 35, color: '#3b82f6' },
  { name: '家具', value: 25, color: '#8b5cf6' },
  { name: '装饰', value: 20, color: '#10b981' },
  { name: '其他', value: 20, color: '#f59e0b' },
];

// Analytics Summary
export const mockAnalyticsSummary: AnalyticsSummary = {
  totalVisits: mockVisitData.reduce((sum, d) => sum + d.count, 0),
  todayVisits: mockVisitData[mockVisitData.length - 1].count,
  totalRevenue: mockSalesData.reduce((sum, d) => sum + d.revenue, 0),
  todayRevenue: mockSalesData[mockSalesData.length - 1].revenue,
  weekRevenue: mockSalesData.reduce((sum, d) => sum + d.revenue, 0),
  monthRevenue: mockSalesData.reduce((sum, d) => sum + d.revenue, 0) * 4 + Math.floor(Math.random() * 3000),
  totalOrders: mockSalesData.reduce((sum, d) => sum + d.orders, 0),
  todayOrders: mockSalesData[mockSalesData.length - 1].orders,
  weekOrders: mockSalesData.reduce((sum, d) => sum + d.orders, 0),
  monthOrders: mockSalesData.reduce((sum, d) => sum + d.orders, 0) * 4 + Math.floor(Math.random() * 40),
  avgOrderValue: Math.floor(mockSalesData.reduce((sum, d) => sum + d.revenue, 0) / mockSalesData.reduce((sum, d) => sum + d.orders, 0))
};

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API functions
export async function getVisitData(): Promise<DailyVisit[]> {
  await delay(300);
  return [...mockVisitData];
}

export async function getProductViews(): Promise<ProductView[]> {
  await delay(300);
  return [...mockProductViews];
}

export async function getSalesData(): Promise<SalesData[]> {
  await delay(300);
  return [...mockSalesData];
}

export async function getCategoryDistribution() {
  await delay(300);
  return [...mockCategoryDistribution];
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  await delay(300);
  return { ...mockAnalyticsSummary };
}