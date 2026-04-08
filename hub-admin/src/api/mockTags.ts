// 标签类型
export type TagType = 'category' | 'capability' | 'region';

// 标签状态
export type TagStatus = 'approved' | 'pending';

// 标签接口
export interface Tag {
  id: string;
  name: string;
  type: TagType;
  count: number; // 使用次数
  status: TagStatus;
  submitter?: string; // 商户名称（待审核时）
  submitTime?: string; // 提交时间
  rejectReason?: string; // 拒绝原因
}

// 预系统标签 - 类目标签
const categoryTags: Tag[] = [
  { id: 'c1', name: '茶具', type: 'category', count: 125, status: 'approved' },
  { id: 'c2', name: '陶瓷', type: 'category', count: 98, status: 'approved' },
  { id: 'c3', name: '手工艺术品', type: 'category', count: 76, status: 'approved' },
  { id: 'c4', name: '文房四宝', type: 'category', count: 54, status: 'approved' },
  { id: 'c5', name: '书画桌', type: 'category', count: 32, status: 'approved' },
  { id: 'c6', name: '定制家具', type: 'category', count: 28, status: 'approved' },
];

// 预系统标签 - 能力标签
const capabilityTags: Tag[] = [
  { id: 'cap1', name: '支持定制', type: 'capability', count: 45, status: 'approved' },
  { id: 'cap2', name: '48小时发货', type: 'capability', count: 38, status: 'approved' },
  { id: 'cap3', name: '包邮', type: 'capability', count: 67, status: 'approved' },
  { id: 'cap4', name: '7天无理由退换', type: 'capability', count: 52, status: 'approved' },
  { id: 'cap5', name: '可开发票', type: 'capability', count: 41, status: 'approved' },
];

// 预系统标签 - 地区标签
const regionTags: Tag[] = [
  { id: 'r1', name: '景德镇', type: 'region', count: 67, status: 'approved' },
  { id: 'r2', name: '龙泉', type: 'region', count: 43, status: 'approved' },
  { id: 'r3', name: '宜兴', type: 'region', count: 38, status: 'approved' },
  { id: 'r4', name: '苏州', type: 'region', count: 29, status: 'approved' },
  { id: 'r5', name: '杭州', type: 'region', count: 25, status: 'approved' },
  { id: 'r6', name: '泉州', type: 'region', count: 18, status: 'approved' },
];

// 待审核标签 - 商户提交的自定义标签
const pendingTags: Tag[] = [
  { id: 'p1', name: '非遗传承', type: 'category', count: 0, status: 'pending', submitter: '茶韵轩', submitTime: '2024-04-01' },
  { id: 'p2', name: '支持代购', type: 'capability', count: 0, status: 'pending', submitter: '手作工坊', submitTime: '2024-04-01' },
  { id: 'p3', name: '成都', type: 'region', count: 0, status: 'pending', submitter: '漆艺斋', submitTime: '2024-03-31' },
  { id: 'p4', name: '首饰设计', type: 'category', count: 0, status: 'pending', submitter: '织锦阁', submitTime: '2024-03-30' },
  { id: 'p5', name: '免费维修', type: 'capability', count: 0, status: 'pending', submitter: '紫砂堂', submitTime: '2024-03-29' },
];

// 合并所有标签
export const mockTags: Tag[] = [
  ...categoryTags,
  ...capabilityTags,
  ...regionTags,
  ...pendingTags,
];

// 模拟API函数
export const getTags = async (): Promise<Tag[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return [...mockTags];
};

export const getTagsByType = async (type: TagType): Promise<Tag[]> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockTags.filter((t) => t.type === type && t.status === 'approved');
};

export const getPendingTags = async (): Promise<Tag[]> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockTags.filter((t) => t.status === 'pending');
};

export const getPopularTags = async (): Promise<Tag[]> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockTags
    .filter((t) => t.status === 'approved')
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

export const addTag = async (tag: Omit<Tag, 'id'>): Promise<Tag> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const newTag: Tag = {
    ...tag,
    id: `t${Date.now()}`,
  };
  mockTags.push(newTag);
  return newTag;
};

export const updateTag = async (id: string, updates: Partial<Tag>): Promise<Tag | undefined> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const index = mockTags.findIndex((t) => t.id === id);
  if (index !== -1) {
    mockTags[index] = { ...mockTags[index], ...updates };
    return mockTags[index];
  }
  return undefined;
};

export const deleteTag = async (id: string): Promise<boolean> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const index = mockTags.findIndex((t) => t.id === id);
  if (index !== -1) {
    mockTags.splice(index, 1);
    return true;
  }
  return false;
};

export const approveTag = async (id: string): Promise<Tag | undefined> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const index = mockTags.findIndex((t) => t.id === id);
  if (index !== -1) {
    mockTags[index].status = 'approved';
    mockTags[index].count = 0; // 新通过的标签初始使用次数为0
    delete mockTags[index].submitter;
    delete mockTags[index].submitTime;
    return mockTags[index];
  }
  return undefined;
};

export const rejectTag = async (id: string, reason?: string): Promise<Tag | undefined> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const index = mockTags.findIndex((t) => t.id === id);
  if (index !== -1) {
    // 拒绝后从列表中移除（也可以选择标记为rejected）
    const rejectedTag = { ...mockTags[index], rejectReason: reason };
    mockTags.splice(index, 1);
    return rejectedTag;
  }
  return undefined;
};

// 标签类型映射
export const tagTypeLabels: Record<TagType, string> = {
  category: '类目',
  capability: '能力',
  region: '地区',
};

export const tagTypeColors: Record<TagType, string> = {
  category: '#3B82F6',
  capability: '#10B981',
  region: '#F59E0B',
};