import type { Order, OrderStatus } from '../types';

export interface MockOrder extends Order {
  items: Array<{
    productId: number;
    productName: string;
    quantity: number;
    price: number;
  }>;
  customerInfo: {
    name: string;
    phone: string;
    address: string;
  };
  logistics?: {
    company: string;
    trackingNumber: string;
    shippedAt?: string;
  };
}

export const mockOrders: MockOrder[] = [
  {
    id: '20260415001',
    status: 'pending',
    total: 128,
    date: '2026-04-15 10:30:00',
    items: [
      { productId: 1, productName: '精品茶具套装', quantity: 1, price: 128 }
    ],
    customerInfo: {
      name: '张三',
      phone: '138****1234',
      address: '北京市朝阳区xxx街道xxx小区1号楼101'
    }
  },
  {
    id: '20260415002',
    status: 'paid',
    total: 256,
    date: '2026-04-15 11:20:00',
    items: [
      { productId: 2, productName: '紫砂壶功夫茶具', quantity: 1, price: 256 }
    ],
    customerInfo: {
      name: '李四',
      phone: '139****5678',
      address: '上海市浦东新区xxx路xxx号'
    }
  },
  {
    id: '20260414003',
    status: 'shipped',
    total: 384,
    date: '2026-04-14 15:45:00',
    items: [
      { productId: 4, productName: '景德镇陶瓷杯', quantity: 4, price: 68 },
      { productId: 6, productName: '刺绣抱枕', quantity: 2, price: 58 }
    ],
    customerInfo: {
      name: '王五',
      phone: '136****9012',
      address: '广州市天河区xxx大道xxx号'
    },
    logistics: {
      company: '顺丰速运',
      trackingNumber: 'SF1234567890',
      shippedAt: '2026-04-15 09:00:00'
    }
  },
  {
    id: '20260414004',
    status: 'completed',
    total: 599,
    date: '2026-04-14 09:10:00',
    items: [
      { productId: 3, productName: '木质收纳柜', quantity: 1, price: 399 },
      { productId: 9, productName: '陶瓷花瓶', quantity: 2, price: 98 }
    ],
    customerInfo: {
      name: '赵六',
      phone: '137****3456',
      address: '深圳市南山区xxx街xxx号'
    },
    logistics: {
      company: '中通快递',
      trackingNumber: 'ZT9876543210',
      shippedAt: '2026-04-14 14:30:00'
    }
  },
  {
    id: '20260414005',
    status: 'cancelled',
    total: 188,
    date: '2026-04-14 16:20:00',
    items: [
      { productId: 5, productName: '复古台灯', quantity: 1, price: 188 }
    ],
    customerInfo: {
      name: '孙七',
      phone: '135****7890',
      address: '杭州市西湖区xxx路xxx号'
    }
  },
  {
    id: '20260413006',
    status: 'paid',
    total: 456,
    date: '2026-04-13 14:30:00',
    items: [
      { productId: 7, productName: '竹编工艺品', quantity: 1, price: 328 },
      { productId: 10, productName: '手工编织坐垫', quantity: 2, price: 78 }
    ],
    customerInfo: {
      name: '周八',
      phone: '134****2345',
      address: '成都市锦江区xxx街xxx号'
    }
  },
  {
    id: '20260413007',
    status: 'shipped',
    total: 226,
    date: '2026-04-13 10:15:00',
    items: [
      { productId: 1, productName: '精品茶具套装', quantity: 1, price: 128 },
      { productId: 4, productName: '景德镇陶瓷杯', quantity: 1, price: 68 }
    ],
    customerInfo: {
      name: '吴九',
      phone: '133****6789',
      address: '武汉市江汉区xxx路xxx号'
    },
    logistics: {
      company: '圆通速递',
      trackingNumber: 'YT5555666677',
      shippedAt: '2026-04-13 18:00:00'
    }
  },
  {
    id: '20260412008',
    status: 'completed',
    total: 168,
    date: '2026-04-12 11:40:00',
    items: [
      { productId: 8, productName: '丝绸桌旗', quantity: 1, price: 168 }
    ],
    customerInfo: {
      name: '郑十',
      phone: '132****1234',
      address: '南京市秦淮区xxx巷xxx号'
    },
    logistics: {
      company: '申通快递',
      trackingNumber: 'ST8888999900',
      shippedAt: '2026-04-12 16:00:00'
    }
  },
  {
    id: '20260412009',
    status: 'pending',
    total: 326,
    date: '2026-04-12 13:25:00',
    items: [
      { productId: 2, productName: '紫砂壶功夫茶具', quantity: 1, price: 256 },
      { productId: 9, productName: '陶瓷花瓶', quantity: 1, price: 98 }
    ],
    customerInfo: {
      name: '陈十一',
      phone: '131****5678',
      address: '西安市雁塔区xxx路xxx号'
    }
  },
  {
    id: '20260411010',
    status: 'cancelled',
    total: 68,
    date: '2026-04-11 17:50:00',
    items: [
      { productId: 4, productName: '景德镇陶瓷杯', quantity: 1, price: 68 }
    ],
    customerInfo: {
      name: '刘十二',
      phone: '130****9012',
      address: '重庆市渝中区xxx街xxx号'
    }
  },
  {
    id: '20260411011',
    status: 'paid',
    total: 394,
    date: '2026-04-11 09:30:00',
    items: [
      { productId: 3, productName: '木质收纳柜', quantity: 1, price: 399 }
    ],
    customerInfo: {
      name: '杨十三',
      phone: '189****3456',
      address: '天津市和平区xxx路xxx号'
    }
  },
  {
    id: '20260410012',
    status: 'shipped',
    total: 136,
    date: '2026-04-10 14:20:00',
    items: [
      { productId: 6, productName: '刺绣抱枕', quantity: 2, price: 58 },
      { productId: 10, productName: '手工编织坐垫', quantity: 1, price: 78 }
    ],
    customerInfo: {
      name: '黄十四',
      phone: '188****7890',
      address: '苏州市姑苏区xxx巷xxx号'
    },
    logistics: {
      company: '韵达快递',
      trackingNumber: 'YD1111222233',
      shippedAt: '2026-04-11 10:00:00'
    }
  },
  {
    id: '20260409013',
    status: 'completed',
    total: 728,
    date: '2026-04-09 16:10:00',
    items: [
      { productId: 7, productName: '竹编工艺品', quantity: 2, price: 328 },
      { productId: 9, productName: '陶瓷花瓶', quantity: 2, price: 98 }
    ],
    customerInfo: {
      name: '林十五',
      phone: '187****2345',
      address: '厦门市思明区xxx大道xxx号'
    },
    logistics: {
      company: '顺丰速运',
      trackingNumber: 'SF4444555566',
      shippedAt: '2026-04-09 20:00:00'
    }
  },
  {
    id: '20260409014',
    status: 'paid',
    total: 198,
    date: '2026-04-09 11:55:00',
    items: [
      { productId: 1, productName: '精品茶具套装', quantity: 1, price: 128 },
      { productId: 5, productName: '复古台灯', quantity: 1, price: 188 }
    ],
    customerInfo: {
      name: '徐十六',
      phone: '186****6789',
      address: '长沙市岳麓区xxx路xxx号'
    }
  },
  {
    id: '20260408015',
    status: 'shipped',
    total: 256,
    date: '2026-04-08 12:40:00',
    items: [
      { productId: 2, productName: '紫砂壶功夫茶具', quantity: 1, price: 256 }
    ],
    customerInfo: {
      name: '何十七',
      phone: '185****9012',
      address: '郑州市二七区xxx街xxx号'
    },
    logistics: {
      company: '中通快递',
      trackingNumber: 'ZT7777888899',
      shippedAt: '2026-04-08 17:30:00'
    }
  }
];

export const statusMap: Record<OrderStatus, { label: string; class: string }> = {
  pending: { label: '待付款', class: 'bg-yellow-100 text-yellow-700' },
  paid: { label: '待发货', class: 'bg-blue-100 text-blue-700' },
  shipped: { label: '已发货', class: 'bg-purple-100 text-purple-700' },
  completed: { label: '已完成', class: 'bg-green-100 text-green-700' },
  cancelled: { label: '已取消', class: 'bg-gray-100 text-gray-500' }
};

// Simulate API delay
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API functions
export async function getOrders(): Promise<MockOrder[]> {
  await delay(300);
  return [...mockOrders];
}

export async function getOrderById(id: string): Promise<MockOrder | undefined> {
  await delay(200);
  return mockOrders.find(o => o.id === id);
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  logistics?: { company: string; trackingNumber: string }
): Promise<MockOrder | undefined> {
  await delay(300);
  const order = mockOrders.find(o => o.id === id);
  if (order) {
    order.status = status;
    if (status === 'shipped' && logistics) {
      order.logistics = {
        ...logistics,
        shippedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
    }
    return { ...order };
  }
  return undefined;
}