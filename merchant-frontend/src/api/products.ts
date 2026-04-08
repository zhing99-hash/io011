/**
 * Merchant API - Products
 * 商品管理 API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = 'https://api.io011.com';

// 类型定义
export interface Product {
  id: string;
  merchant_id: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  category?: string;
  images?: string[];
  stock: number;
  status: 'active' | 'inactive' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  category?: string;
  images?: string[];
  stock?: number;
  status?: 'active' | 'inactive';
}

// API 函数
async function fetchProducts(merchantId: string, filters?: { category?: string; status?: string; search?: string }): Promise<Product[]> {
  const params = new URLSearchParams({ merchant_id: merchantId });
  
  if (filters?.category) params.append('category', filters.category);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);
  
  const response = await fetch(`${API_BASE}/api/v1/products?${params}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('获取商品列表失败');
  }
  
  const data = await response.json();
  return data.data?.products || [];
}

async function fetchProduct(id: string): Promise<Product> {
  const response = await fetch(`${API_BASE}/api/v1/products/${id}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('获取商品详情失败');
  }
  
  const data = await response.json();
  return data.data;
}

async function createProduct(merchantId: string, product: ProductInput, token: string): Promise<Product> {
  const response = await fetch(`${API_BASE}/api/v1/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ ...product, merchant_id: merchantId }),
  });
  
  if (!response.ok) {
    throw new Error('创建商品失败');
  }
  
  const data = await response.json();
  return data.data;
}

async function updateProduct(id: string, product: Partial<ProductInput>, token: string): Promise<Product> {
  const response = await fetch(`${API_BASE}/api/v1/products/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(product),
  });
  
  if (!response.ok) {
    throw new Error('更新商品失败');
  }
  
  const data = await response.json();
  return data.data;
}

async function deleteProduct(id: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/products/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('删除商品失败');
  }
}

// React Query Hooks
export function useProducts(merchantId: string, filters?: { category?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['products', merchantId, filters],
    queryFn: () => fetchProducts(merchantId, filters),
    enabled: !!merchantId,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
  });
}

export function useCreateProduct(merchantId: string) {
  const queryClient = useQueryClient();
  const token = localStorage.getItem('token') || '';
  
  return useMutation({
    mutationFn: (product: ProductInput) => createProduct(merchantId, product, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', merchantId] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const token = localStorage.getItem('token') || '';
  
  return useMutation({
    mutationFn: ({ id, product }: { id: string; product: Partial<ProductInput> }) => 
      updateProduct(id, product, token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products', data.merchant_id] });
      queryClient.invalidateQueries({ queryKey: ['product', data.id] });
    },
  });
}

export function useDeleteProduct(merchantId: string) {
  const queryClient = useQueryClient();
  const token = localStorage.getItem('token') || '';
  
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', merchantId] });
    },
  });
}