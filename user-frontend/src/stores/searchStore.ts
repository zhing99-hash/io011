import { create } from 'zustand';
import type { SearchProgressState, StepStatus } from '../types/search';
import type { SearchResult, Merchant, Product } from '../api/mockData';

const initialSteps = {
  parse: {
    status: 'pending' as StepStatus,
    title: '解析需求',
    description: '正在分析您的搜索需求...',
  },
  match: {
    status: 'pending' as StepStatus,
    title: '匹配商户',
    description: '正在为您匹配相关商户...',
  },
  products: {
    status: 'pending' as StepStatus,
    title: '获取商品',
    description: '正在获取商品信息...',
  },
};

// 筛选和排序类型
export type SortOption = 'relevance' | 'price-asc' | 'price-desc' | 'rating';

export interface FilterState {
  categories: string[];
  regions: string[];
  minPrice?: number;
  maxPrice?: number;
  sort: SortOption;
}

// 扩展搜索状态以支持完整的搜索结果
interface SearchState {
  query: string;
  setQuery: (query: string) => void;
  
  // 筛选状态
  filters: FilterState;
  setCategories: (categories: string[]) => void;
  setRegions: (regions: string[]) => void;
  setPriceRange: (min?: number, max?: number) => void;
  setSort: (sort: SortOption) => void;
  resetFilters: () => void;
  updateFiltersFromUrl: (params: URLSearchParams) => void;
  
  // 完整的搜索结果
  merchants: Merchant[];
  products: Product[];
  totalResults: number;
  
  // 原始搜索结果（未筛选）
  rawMerchants: Merchant[];
  rawProducts: Product[];
  
  // 数据更新方法
  setResults: (results: SearchResult) => void;
  applyFilters: () => void;
  setMerchants: (merchants: Merchant[]) => void;
  setProducts: (products: Product[]) => void;
  
  // 加载状态
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // 进度相关状态
  progress: SearchProgressState;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
  
  // 筛选状态初始化
  filters: {
    categories: [],
    regions: [],
    minPrice: undefined,
    maxPrice: undefined,
    sort: 'relevance',
  },
  
  setCategories: (categories) => set((state) => ({
    filters: { ...state.filters, categories }
  })),
  
  setRegions: (regions) => set((state) => ({
    filters: { ...state.filters, regions }
  })),
  
  setPriceRange: (minPrice, maxPrice) => set((state) => ({
    filters: { ...state.filters, minPrice, maxPrice }
  })),
  
  setSort: (sort) => set((state) => ({
    filters: { ...state.filters, sort }
  })),
  
  resetFilters: () => set({
    filters: {
      categories: [],
      regions: [],
      minPrice: undefined,
      maxPrice: undefined,
      sort: 'relevance',
    }
  }),
  
  updateFiltersFromUrl: (params) => {
    const categories = params.get('categories')?.split(',').filter(Boolean) || [];
    const regions = params.get('regions')?.split(',').filter(Boolean) || [];
    const minPrice = params.get('minPrice');
    const maxPrice = params.get('maxPrice');
    const sort = (params.get('sort') as SortOption) || 'relevance';
    
    set({
      filters: {
        categories,
        regions,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sort: ['relevance', 'price-asc', 'price-desc', 'rating'].includes(sort) ? sort : 'relevance',
      }
    });
  },
  
  // 初始化为空结果
  merchants: [],
  products: [],
  totalResults: 0,
  
  // 原始搜索结果
  rawMerchants: [],
  rawProducts: [],
  
  // 完整设置搜索结果并保存原始数据
  setResults: (results: SearchResult) => {
    // 先保存原始结果用于筛选
    const rawMerchants = results.merchants || [];
    const rawProducts = results.products || [];
    
    set({
      rawMerchants,
      rawProducts,
      merchants: rawMerchants,
      products: rawProducts,
      totalResults: results.totalResults || 0,
    });
  },
  
  // 应用筛选和排序
  applyFilters: () => {
    const state = useSearchStore.getState();
    const { rawMerchants, rawProducts, filters } = state;
    
    // 筛选商户
    let filteredMerchants = rawMerchants.filter(m => {
      // 分类筛选
      const matchCategory = filters.categories.length === 0 ||
        filters.categories.some(cat => 
          m.categories.some(c => c.includes(cat))
        );
      
      // 地区筛选
      const matchRegion = filters.regions.length === 0 ||
        filters.regions.some(region => m.location.includes(region.replace('北京市', '')));
      
      return matchCategory && matchRegion;
    });
    
    // 筛选商品
    let filteredProducts = rawProducts.filter(p => {
      const merchant = rawMerchants.find(m => m.id === p.merchantId);
      
      // 价格筛选
      const matchPrice = (filters.minPrice === undefined || p.price >= filters.minPrice) &&
        (filters.maxPrice === undefined || p.price <= filters.maxPrice);
      
      // 分类筛选
      const matchCategory = filters.categories.length === 0 || 
        (merchant && filters.categories.some(cat => 
          merchant.categories.some(c => c.includes(cat))
        ));
      
      // 地区筛选
      const matchRegion = filters.regions.length === 0 ||
        (merchant && filters.regions.some(region => 
          merchant.location.includes(region.replace('北京市', ''))
        ));
      
      return matchPrice && matchCategory && matchRegion;
    });
    
    // 排序商户
    switch (filters.sort) {
      case 'rating':
        filteredMerchants = [...filteredMerchants].sort((a, b) => b.rating - a.rating);
        break;
      // relevance 保持原始顺序
    }
    
    // 排序商品
    switch (filters.sort) {
      case 'price-asc':
        filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        // 按商户评分排序
        filteredProducts = [...filteredProducts].sort((a, b) => {
          const merchantA = rawMerchants.find(m => m.id === a.merchantId);
          const merchantB = rawMerchants.find(m => m.id === b.merchantId);
          return (merchantB?.rating || 0) - (merchantA?.rating || 0);
        });
        break;
      // relevance 保持原始顺序
    }
    
    set({
      merchants: filteredMerchants,
      products: filteredProducts,
      totalResults: filteredMerchants.length + filteredProducts.length,
    });
  },
  
  // 单独设置商户
  setMerchants: (merchants: Merchant[]) => set({ merchants }),
  
  // 单独设置商品
  setProducts: (products: Product[]) => set({ products }),
  
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  
  // 进度状态
  progress: {
    currentStep: 0,
    steps: { ...initialSteps },
    error: null,
    isTimeout: false,
    
    startSearch: () => set((state) => ({
      progress: {
        ...state.progress,
        currentStep: 1,
        steps: {
          parse: { ...state.progress.steps.parse, status: 'in-progress' },
          match: { ...initialSteps.match },
          products: { ...initialSteps.products },
        },
        error: null,
        isTimeout: false,
      }
    })),
    
    setStepStatus: (step, status) => set((state) => {
      const stepKey = step as keyof typeof state.progress.steps;
      const newSteps = { ...state.progress.steps };
      newSteps[stepKey] = { ...newSteps[stepKey], status };
      
      // 根据步骤状态更新当前步骤
      let currentStep = state.progress.currentStep;
      if (status === 'completed') {
        if (step === 'parse') currentStep = 2;
        if (step === 'match') currentStep = 3;
        if (step === 'products') currentStep = 3;
      } else if (status === 'in-progress') {
        if (step === 'parse') currentStep = 1;
        if (step === 'match') currentStep = 2;
        if (step === 'products') currentStep = 3;
      }
      
      return {
        progress: {
          ...state.progress,
          currentStep,
          steps: newSteps,
        }
      };
    }),
    
    setStepData: (step, data) => set((state) => {
      const stepKey = step as keyof typeof state.progress.steps;
      const newSteps = { ...state.progress.steps };
      newSteps[stepKey] = { ...newSteps[stepKey], ...data };
      
      return {
        progress: {
          ...state.progress,
          steps: newSteps,
        }
      };
    }),
    
    setError: (error) => set((state) => ({
      progress: {
        ...state.progress,
        error,
      }
    })),
    
    setTimeout: (isTimeout) => set((state) => ({
      progress: {
        ...state.progress,
        isTimeout,
      }
    })),
    
    reset: () => set((state) => ({
      progress: {
        ...state.progress,
        currentStep: 0,
        steps: { ...initialSteps },
        error: null,
        isTimeout: false,
      }
    })),
  },
}));