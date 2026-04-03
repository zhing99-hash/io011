// 模拟商户数据
export interface Merchant {
  id: string;
  name: string;
  logo: string;
  location: string;
  rating: number;
  categories: string[];
  tags: string[];
}

// 模拟商品数据
export interface Product {
  id: string;
  merchantId: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

// 模拟商户数据
export const mockMerchants: Merchant[] = [
  {
    id: 'm1',
    name: '海底捞火锅',
    logo: 'https://picsum.photos/seed/merchant1/100/100',
    location: '北京市朝阳区三里屯太古里',
    rating: 4.8,
    categories: ['火锅', '川味', '聚会'],
    tags: ['24小时营业', '可预约', '包厢'],
  },
  {
    id: 'm2',
    name: '西贝莜面村',
    logo: 'https://picsum.photos/seed/merchant2/100/100',
    location: '北京市海淀区中关村大街',
    rating: 4.6,
    categories: ['西北菜', '面食', '家常'],
    tags: ['现做', '健康', '实惠'],
  },
  {
    id: 'm3',
    name: '绿茶餐厅',
    logo: 'https://picsum.photos/seed/merchant3/100/100',
    location: '北京市东城区王府井步行街',
    rating: 4.5,
    categories: ['江浙菜', '家常菜', '杭帮菜'],
    tags: ['环境好', '性价比高', '老字号'],
  },
  {
    id: 'm4',
    name: '避风塘',
    logo: 'https://picsum.photos/seed/merchant4/100/100',
    location: '北京市西城区金融街',
    rating: 4.4,
    categories: ['粤菜', '茶餐厅', '海鲜'],
    tags: ['正宗', '精致', '下午茶'],
  },
  {
    id: 'm5',
    name: '全聚德烤鸭店',
    logo: 'https://picsum.photos/seed/merchant5/100/100',
    location: '北京市东城区前门大街',
    rating: 4.7,
    categories: ['烤鸭', '京菜', '老字号'],
    tags: ['百年老店', '招牌烤鸭', '文化底蕴'],
  },
];

// 模拟商品数据
export const mockProducts: Product[] = [
  {
    id: 'p1',
    merchantId: 'm1',
    name: '招牌毛肚',
    price: 88,
    image: 'https://picsum.photos/seed/product1/300/200',
    description: '当日鲜毛肚，七上七下捞出，口感脆嫩',
  },
  {
    id: 'p2',
    merchantId: 'm1',
    name: '手切鲜羊肉',
    price: 68,
    image: 'https://picsum.photos/seed/product2/300/200',
    description: '锡林郭勒盟散养羊肉，现切保鲜',
  },
  {
    id: 'p3',
    merchantId: 'm1',
    name: '招牌锅底',
    price: 58,
    image: 'https://picsum.photos/seed/product3/300/200',
    description: '经典麻辣锅底，麻辣鲜香',
  },
  {
    id: 'p4',
    merchantId: 'm2',
    name: '莜面鱼鱼',
    price: 38,
    image: 'https://picsum.photos/seed/product4/300/200',
    description: '手工莜面，配番茄鸡蛋卤',
  },
  {
    id: 'p5',
    merchantId: 'm2',
    name: '羊肉串',
    price: 6,
    image: 'https://picsum.photos/seed/product5/300/200',
    description: '新鲜羊肉，炭火烤制',
  },
  {
    id: 'p6',
    merchantId: 'm3',
    name: '东坡肉',
    price: 58,
    image: 'https://picsum.photos/seed/product6/300/200',
    description: '肥而不腻，入口即化',
  },
  {
    id: 'p7',
    merchantId: 'm3',
    name: '龙井虾仁',
    price: 88,
    image: 'https://picsum.photos/seed/product7/300/200',
    description: '新鲜河虾，手剥去壳',
  },
  {
    id: 'p8',
    merchantId: 'm4',
    name: '水晶虾皇饺',
    price: 32,
    image: 'https://picsum.photos/seed/product8/300/200',
    description: '皮薄馅大，虾仁饱满',
  },
  {
    id: 'p9',
    merchantId: 'm4',
    name: '流沙包',
    price: 26,
    image: 'https://picsum.photos/seed/product9/300/200',
    description: '金黄流沙，奶香浓郁',
  },
  {
    id: 'p10',
    merchantId: 'm5',
    name: '北京烤鸭',
    price: 268,
    image: 'https://picsum.photos/seed/product10/300/200',
    description: '果木烤鸭皮脂酥脆，肉质鲜嫩',
  },
  {
    id: 'p11',
    merchantId: 'm5',
    name: '鸭架汤',
    price: 38,
    image: 'https://picsum.photos/seed/product11/300/200',
    description: '鸭架熬汤，配豆腐白菜',
  },
];

// 模拟搜索结果
export interface SearchResult {
  merchants: Merchant[];
  products: Product[];
  totalResults: number;
  query: string;
}

// 根据关键词搜索数据
export function searchMockData(query: string, filters?: { category?: string; minPrice?: number; maxPrice?: number }): SearchResult {
  const normalizedQuery = query.toLowerCase().trim();
  
  // 过滤商户
  let merchants = mockMerchants.filter(m => {
    const matchQuery = !normalizedQuery || 
      m.name.toLowerCase().includes(normalizedQuery) ||
      m.categories.some(c => c.toLowerCase().includes(normalizedQuery)) ||
      m.tags.some(t => t.toLowerCase().includes(normalizedQuery)) ||
      m.location.toLowerCase().includes(normalizedQuery);
    return matchQuery;
  });

  // 过滤商品
  let products = mockProducts.filter(p => {
    const matchQuery = !normalizedQuery ||
      p.name.toLowerCase().includes(normalizedQuery) ||
      p.description.toLowerCase().includes(normalizedQuery);
    
    // 价格过滤
    const matchPrice = (!filters?.minPrice || p.price >= filters.minPrice) &&
      (!filters?.maxPrice || p.price <= filters.maxPrice);
    
    // 分类过滤
    const merchant = mockMerchants.find(m => m.id === p.merchantId);
    const matchCategory = !filters?.category || 
      merchant?.categories.some(c => c.toLowerCase().includes(filters.category!.toLowerCase()));
    
    return matchQuery && matchPrice && matchCategory;
  });

  // 如果指定了分类过滤，也按商户分类过滤商户
  if (filters?.category) {
    merchants = merchants.filter(m => 
      m.categories.some(c => c.toLowerCase().includes(filters.category!.toLowerCase()))
    );
  }

  return {
    merchants,
    products,
    totalResults: merchants.length + products.length,
    query,
  };
}