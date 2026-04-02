// 搜索进度步骤状态
export type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error';

// 搜索步骤数据
export interface SearchStep {
  status: StepStatus;
  title: string;
  description?: string;
  // 步骤1: 解析需求
  category?: string;
  tags?: string[];
  budget?: { min: number; max: number };
  // 步骤2: 匹配商户
  merchants?: Array<{
    id: string;
    name: string;
    location: string;
    rating: number;
  }>;
  // 步骤3: 获取商品
  progress?: number;
  totalMerchants?: number;
  returnedMerchants?: number;
}

// 搜索错误
export interface SearchError {
  message: string;
  details?: string;
  code?: string;
}

// 搜索状态
export interface SearchProgressState {
  // 整体状态
  currentStep: number; // 1, 2, 3
  steps: {
    parse: SearchStep;
    match: SearchStep;
    products: SearchStep;
  };
  error: SearchError | null;
  isTimeout: boolean;
  
  // Actions
  startSearch: () => void;
  setStepStatus: (step: 'parse' | 'match' | 'products', status: StepStatus) => void;
  setStepData: (step: 'parse' | 'match' | 'products', data: Partial<SearchStep>) => void;
  setError: (error: SearchError | null) => void;
  setTimeout: (timeout: boolean) => void;
  reset: () => void;
}