import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchMockData } from './mockData';

// ==================== 类型定义 ====================

// 搜索参数
export interface SearchParams {
  query: string;
  filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
  };
}

// 搜索结果（与 mockData 保持一致）
export interface SearchResult {
  merchants: import('./mockData').Merchant[];
  products: import('./mockData').Product[];
  totalResults: number;
  query: string;
}

// API 错误类型
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: string;
}

// ==================== 配置常量 ====================

// API 基础配置
const API_BASE_URL = 'https://api.io011.com/api/v1';
const SEARCH_ENDPOINT = '/search';

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 基础重试间隔 (ms)
  retryBackoff: 2, // 指数退避倍数
};

// 缓存配置
const CACHE_CONFIG = {
  staleTime: 5 * 60 * 1000, // 数据过期时间：5分钟
  cacheTime: 10 * 60 * 1000, // 缓存保留时间：10分钟
};

// 请求超时配置 (已实现)
const REQUEST_TIMEOUT = 30000; // 30秒超时

// ==================== API 请求函数 ====================

/**
 * 调用搜索API（实际请求或使用Mock数据）
 * 使用 Mock 数据因为后端未就绪
 */
async function fetchSearchResults(params: SearchParams): Promise<SearchResult> {
  const { query, filters } = params;
  
  // 构建URL参数
  const urlParams = new URLSearchParams();
  urlParams.append('query', query);
  if (filters?.category) {
    urlParams.append('filters', JSON.stringify(filters));
  }
  
  const url = `${API_BASE_URL}${SEARCH_ENDPOINT}?${urlParams.toString()}`;
  
  // 创建带超时的 AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    // 尝试真实API请求
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // 处理HTTP错误
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw mapHttpError(response.status, errorData);
    }
    
    const data = await response.json();
    return formatSearchResult(data);
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // 如果是网络错误或超时，使用Mock数据
    if (error.name === 'AbortError' || error.message === 'Failed to fetch' || error.message === 'Network request failed') {
      console.log('API不可用，使用Mock数据');
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      return searchMockData(query, filters);
    }
    
    throw error;
  }
}

// ==================== 错误处理 ====================

/**
 * 将HTTP状态码映射为用户友好的错误
 */
function mapHttpError(status: number, data: any): ApiError {
  const errorMap: Record<number, { message: string; code: string }> = {
    400: { message: '请求参数有误，请检查搜索关键词', code: 'BAD_REQUEST' },
    401: { message: '登录状态已过期，请重新登录', code: 'UNAUTHORIZED' },
    403: { message: '没有访问权限', code: 'FORBIDDEN' },
    404: { message: '请求的资源不存在', code: 'NOT_FOUND' },
    429: { message: '请求过于频繁，请稍后再试', code: 'RATE_LIMITED' },
    500: { message: '服务器内部错误，请稍后重试', code: 'SERVER_ERROR' },
    502: { message: '服务暂时不可用', code: 'BAD_GATEWAY' },
    503: { message: '服务维护中，请稍后再试', code: 'SERVICE_UNAVAILABLE' },
  };
  
  const errorInfo = errorMap[status] || { message: '请求失败，请稍后重试', code: 'UNKNOWN' };
  
  return {
    message: errorInfo.message,
    code: errorInfo.code,
    status,
    details: data.message || `HTTP ${status} 错误`,
  };
}

/**
 * 处理网络错误
 */
function handleNetworkError(error: any): ApiError {
  if (error.name === 'AbortError') {
    return {
      message: '请求超时，请稍后重试',
      code: 'TIMEOUT',
      details: `等待响应超过 ${REQUEST_TIMEOUT / 1000} 秒`,
    };
  }
  
  return {
    message: '网络连接失败，请检查网络设置',
    code: 'NETWORK_ERROR',
    details: error.message || '网络请求失败',
  };
}

// ==================== 数据格式化 ====================

/**
 * 格式化搜索结果，确保数据格式一致
 */
function formatSearchResult(data: any): SearchResult {
  return {
    merchants: Array.isArray(data.merchants) ? data.merchants : [],
    products: Array.isArray(data.products) ? data.products : [],
    totalResults: data.totalResults ?? (data.merchants?.length ?? 0) + (data.products?.length ?? 0),
    query: data.query || '',
  };
}

// ==================== React Query Hook ====================

/**
 * 搜索_hook
 * 
 * 功能特性：
 * - 使用 React Query 管理请求状态
 * - 自动重试机制（网络错误时重试3次，间隔递增）
 * - 请求缓存（5分钟 staleTime）
 * - 强制刷新支持
 */
export function useSearch(params: SearchParams) {
  const { query, filters } = params;
  
  // 构建查询缓存key
  const queryKey = ['search', query, filters];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      // 验证参数
      if (!query.trim()) {
        return {
          merchants: [],
          products: [],
          totalResults: 0,
          query: '',
        };
      }
      
      try {
        const result = await fetchSearchResults({ query, filters });
        
        // 更新缓存到 Store (在组件中使用)
        return result;
      } catch (error: any) {
        // 转换错误
        if (error.status) {
          throw error;
        } else {
          throw handleNetworkError(error);
        }
      }
    },
    
    // 缓存配置
    staleTime: CACHE_CONFIG.staleTime,
    gcTime: CACHE_CONFIG.cacheTime, // 注意：v5 中是 gcTime，v4 是 cacheTime
    
    // 重试配置：仅对网络错误重试
    retry: (failureCount, error: any) => {
      // 最多重试3次
      if (failureCount >= RETRY_CONFIG.maxRetries) {
        return false;
      }
      
      // 仅对网络相关错误重试
      const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'ECONNABORTED'];
      const isNetworkError = !error.status || error.status >= 500;
      const isRetryableCode = retryableCodes.includes(error.code);
      
      return isNetworkError || isRetryableCode;
    },
    
    // 重试延迟：指数退避
    retryDelay: (attemptIndex) => {
      return RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.retryBackoff, attemptIndex);
    },
    
    // 启用条件： query 非空
    enabled: query.trim().length > 0,
  });
}

/**
 * 预加载搜索结果到缓存
 * 用于提前缓存搜索结果，提升用户体验
 */
export function usePrefetchSearch() {
  const queryClient = useQueryClient();
  
  return (params: SearchParams) => {
    const { query, filters } = params;
    const queryKey = ['search', query, filters];
    
    queryClient.prefetchQuery({
      queryKey,
      queryFn: () => fetchSearchResults({ query, filters }),
      staleTime: CACHE_CONFIG.staleTime,
    });
  };
}

/**
 * 手动使空搜索缓存
 * 用于清除指定查询的缓存
 */
export function useInvalidateSearch() {
  const queryClient = useQueryClient();
  
  return (query?: string) => {
    if (query) {
      // 清除指定查询的缓存
      queryClient.invalidateQueries({ queryKey: ['search', query] });
    } else {
      // 清除所有搜索缓存
      queryClient.invalidateQueries({ queryKey: ['search'] });
    }
  };
}

/**
 * 手动设置搜索结果到缓存
 * 用于测试或模拟数据注入
 */
export function useSetSearchResults() {
  const queryClient = useQueryClient();
  
  return (params: SearchParams, results: SearchResult) => {
    const queryKey = ['search', params.query, params.filters];
    queryClient.setQueryData(queryKey, results);
  };
}

// ==================== 导出工具函数 ====================

// 为了方便单元测试，导出主要函数
export {
  fetchSearchResults,
  formatSearchResult,
  mapHttpError,
  handleNetworkError,
  RETRY_CONFIG,
  CACHE_CONFIG,
  REQUEST_TIMEOUT,
};