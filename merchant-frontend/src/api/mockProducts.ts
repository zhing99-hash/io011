import type { Product } from '../types';

export const mockProducts: Product[] = [
  {
    id: 1,
    name: '精品茶具套装',
    price: 128,
    stock: 50,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=100&h=100&fit=crop',
    description: '采用优质陶瓷材质，精美茶具套装，适合送礼或自用'
  },
  {
    id: 2,
    name: '紫砂壶功夫茶具',
    price: 256,
    stock: 20,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=100&h=100&fit=crop',
    description: '传统紫砂壶，手工制作，经典功夫茶具'
  },
  {
    id: 3,
    name: '木质收纳柜',
    price: 399,
    stock: 15,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=100&h=100&fit=crop',
    description: '实木收纳柜，多层设计，完美收纳'
  },
  {
    id: 4,
    name: '景德镇陶瓷杯',
    price: 68,
    stock: 100,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=100&h=100&fit=crop',
    description: '景德镇手工陶瓷杯，精致美观'
  },
  {
    id: 5,
    name: '复古台灯',
    price: 188,
    stock: 0,
    status: 'inactive',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=100&h=100&fit=crop',
    description: '复古风格台灯，温馨舒适'
  },
  {
    id: 6,
    name: '刺绣抱枕',
    price: 58,
    stock: 80,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=100&h=100&fit=crop',
    description: '手工刺绣抱枕，舒适柔软'
  },
  {
    id: 7,
    name: '竹编工艺品',
    price: 328,
    stock: 12,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1605218427368-351816b936e5?w=100&h=100&fit=crop',
    description: '传统竹编工艺，精细美观'
  },
  {
    id: 8,
    name: '丝绸桌旗',
    price: 168,
    stock: 5,
    status: 'inactive',
    image: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=100&h=100&fit=crop',
    description: '高档丝绸桌旗，提升格调'
  },
  {
    id: 9,
    name: '陶瓷花瓶',
    price: 98,
    stock: 35,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=100&h=100&fit=crop',
    description: '简约陶瓷花瓶，插花佳品'
  },
  {
    id: 10,
    name: '手工编织坐垫',
    price: 78,
    stock: 60,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=100&h=100&fit=crop',
    description: '手工编织坐垫，舒适透气'
  }
];

// Simulate API delay
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API functions
export async function getProducts(): Promise<Product[]> {
  await delay(300);
  return [...mockProducts];
}

export async function getProductById(id: number): Promise<Product | undefined> {
  await delay(200);
  return mockProducts.find(p => p.id === id);
}

export async function updateProductStatus(id: number, status: 'active' | 'inactive'): Promise<Product | undefined> {
  await delay(300);
  const product = mockProducts.find(p => p.id === id);
  if (product) {
    product.status = status;
    return { ...product };
  }
  return undefined;
}

export async function updateProduct(id: number, data: Partial<Product>): Promise<Product | undefined> {
  await delay(300);
  const index = mockProducts.findIndex(p => p.id === id);
  if (index !== -1) {
    mockProducts[index] = { ...mockProducts[index], ...data };
    return { ...mockProducts[index] };
  }
  return undefined;
}

export async function createProduct(data: Omit<Product, 'id'>): Promise<Product> {
  await delay(300);
  const newProduct: Product = {
    ...data,
    id: Math.max(...mockProducts.map(p => p.id)) + 1
  };
  mockProducts.push(newProduct);
  return { ...newProduct };
}