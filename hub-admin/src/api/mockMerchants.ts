// Merchant status types
export type MerchantStatus = 'pending' | 'active' | 'rejected' | 'banned';

// Merchant interface
export interface Merchant {
  id: string;
  name: string;
  logo: string;
  description: string;
  tags: string[];
  status: MerchantStatus;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  endpoint: string;
  apiKey: string;
  banReason?: string;
  bannedAt?: string;
}

// Mock merchant data - 10 sample merchants
export const mockMerchants: Merchant[] = [
  {
    id: '1',
    name: 'TeaHouse',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=TH&backgroundColor=f5f5f5',
    description: 'High quality tea sets and ceramic art',
    tags: ['tea', 'ceramic', 'handmade'],
    status: 'active',
    contactName: 'Li Xing',
    phone: '138****8888',
    email: 'contact@teahouse.com',
    address: 'Beijing Chaoyang District',
    createdAt: '2024-04-01',
    endpoint: 'https://api.teahouse.com/v1',
    apiKey: 'sk_test_xxxx',
  },
  {
    id: '2',
    name: 'CraftWorkshop',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=CW&backgroundColor=f5f5f5',
    description: 'Handmade crafts and personalized gifts',
    tags: ['craft', 'gift', 'custom'],
    status: 'active',
    contactName: 'Wang Ming',
    phone: '139****9999',
    email: 'hello@craftworkshop.com',
    address: 'Shanghai Pudong District',
    createdAt: '2024-04-05',
    endpoint: 'https://api.craftworkshop.com/v1',
    apiKey: 'sk_test_yyyy',
  },
  {
    id: '3',
    name: 'TechHub',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=TH&backgroundColor=f5f5f5',
    description: 'Smart technology solutions',
    tags: ['tech', 'smart', 'iot'],
    status: 'active',
    contactName: 'Zhang Wei',
    phone: '136****7777',
    email: 'info@techhub.com',
    address: 'Shenzhen Nanshan District',
    createdAt: '2024-04-10',
    endpoint: 'https://api.techhub.com/v1',
    apiKey: 'sk_test_zzzz',
  },
  {
    id: '4',
    name: 'GreenOrganic',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=GO&backgroundColor=f5f5f5',
    description: 'Organic vegetables and fruits',
    tags: ['organic', 'food', 'healthy'],
    status: 'active',
    contactName: 'Liu Yang',
    phone: '137****6666',
    email: 'sales@greenorganic.com',
    address: 'Guangzhou Tianhe District',
    createdAt: '2024-04-15',
    endpoint: 'https://api.greenorganic.com/v1',
    apiKey: 'sk_test_aaaa',
  },
  {
    id: '5',
    name: 'FashionCloset',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=FC&backgroundColor=f5f5f5',
    description: 'Trendy fashion clothing',
    tags: ['fashion', 'clothing', 'style'],
    status: 'active',
    contactName: 'Chen Jing',
    phone: '135****5555',
    email: 'support@fashioncloset.com',
    address: 'Hangzhou Xihu District',
    createdAt: '2024-04-20',
    endpoint: 'https://api.fashioncloset.com/v1',
    apiKey: 'sk_test_bbbb',
  },
  {
    id: '6',
    name: 'SmartDrive',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=SD&backgroundColor=f5f5f5',
    description: 'Smart car accessories',
    tags: ['car', 'smart', 'accessories'],
    status: 'active',
    contactName: 'Zhou Qiang',
    phone: '134****4444',
    email: 'contact@smartdrive.com',
    address: 'Chengdu Jinjiang District',
    createdAt: '2024-04-25',
    endpoint: 'https://api.smartdrive.com/v1',
    apiKey: 'sk_test_cccc',
  },
  {
    id: '7',
    name: 'BookHeaven',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=BH&backgroundColor=f5f5f5',
    description: 'Books and literary products',
    tags: ['book', 'literature', 'education'],
    status: 'active',
    contactName: 'Xu Lei',
    phone: '133****3333',
    email: 'service@bookheaven.com',
    address: 'Nanjing Xuanwu District',
    createdAt: '2024-05-01',
    endpoint: 'https://api.bookheaven.com/v1',
    apiKey: 'sk_test_dddd',
  },
  {
    id: '8',
    name: 'HealthHome',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=HH&backgroundColor=f5f5f5',
    description: 'Health and wellness products',
    tags: ['health', 'wellness', 'medical'],
    status: 'active',
    contactName: 'Sun Hui',
    phone: '132****2222',
    email: 'info@healthhome.com',
    address: 'Wuhan Wuchang District',
    createdAt: '2024-05-05',
    endpoint: 'https://api.healthhome.com/v1',
    apiKey: 'sk_test_eeee',
  },
  {
    id: '9',
    name: 'GlobalFood',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=GF&backgroundColor=f5f5f5',
    description: 'International cuisine ingredients',
    tags: ['food', 'international', 'ingredients'],
    status: 'active',
    contactName: 'Ma Lin',
    phone: '131****1111',
    email: 'order@globalfood.com',
    address: 'Suzhou Industrial Park',
    createdAt: '2024-05-10',
    endpoint: 'https://api.globalfood.com/v1',
    apiKey: 'sk_test_ffff',
  },
  {
    id: '10',
    name: 'CreativeStudio',
    logo: 'https://api.dicebear.com/7.x/initials/svg?seed=CS&backgroundColor=f5f5f5',
    description: 'Creative design services',
    tags: ['design', 'creative', 'art'],
    status: 'active',
    contactName: 'Zhu Hua',
    phone: '130****0000',
    email: 'hello@creativestudio.com',
    address: 'Xian Beilin District',
    createdAt: '2024-05-15',
    endpoint: 'https://api.creativestudio.com/v1',
    apiKey: 'sk_test_gggg',
  },
];

// Get all merchants with optional filters
export function getMerchants(searchName?: string, statusFilter?: string): Merchant[] {
  let result = [...mockMerchants];
  
  if (searchName) {
    result = result.filter(m => 
      m.name.toLowerCase().includes(searchName.toLowerCase()) ||
      m.description.toLowerCase().includes(searchName.toLowerCase())
    );
  }
  
  if (statusFilter && statusFilter !== 'all') {
    result = result.filter(m => m.status === statusFilter);
  }
  
  return result;
}

// Get merchant by ID
export function getMerchantById(id: string): Merchant | undefined {
  return mockMerchants.find(m => m.id === id);
}

// Update merchant status
export function updateMerchantStatus(id: string, status: MerchantStatus, banReason?: string): Merchant | undefined {
  const merchant = mockMerchants.find(m => m.id === id);
  if (merchant) {
    merchant.status = status;
    if (status === 'banned') {
      merchant.banReason = banReason;
      merchant.bannedAt = new Date().toISOString();
    } else {
      delete merchant.banReason;
      delete merchant.bannedAt;
    }
  }
  return merchant;
}
