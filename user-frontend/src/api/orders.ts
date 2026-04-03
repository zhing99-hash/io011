/**
 * User API - Orders
 * 用户订单 API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = 'https://api.io011.com';

// 类型定义
export interface OrderItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Order {
  id: string;
  order_number: string;
  merchant_id: string;
  merchant_name?: string;
  user_id: string;
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
  contact?: string;
  address?: string;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderInput {
  merchant_id: string;
  items: OrderItem[];
  total_amount: number;
  contact?: string;
  address?: string;
}

// API 函数
async function fetchOrders(userId: string, status?: string): Promise<Order[]> {
  const params = new URLSearchParams({ user_id: userId });
  if (status) params.append('status', status);
  
  const response = await fetch(`${API_BASE}/api/v1/orders?${params}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('获取订单列表失败');
  }
  
  const data = await response.json();
  return data.data?.orders || [];
}

async function fetchOrder(id: string): Promise<Order> {
  const response = await fetch(`${API_BASE}/api/v1/orders/${id}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('获取订单详情失败');
  }
  
  const data = await response.json();
  return data.data;
}

async function createOrder(order: OrderInput, token: string): Promise<Order> {
  const response = await fetch(`${API_BASE}/api/v1/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(order),
  });
  
  if (!response.ok) {
    throw new Error('创建订单失败');
  }
  
  const data = await response.json();
  return data.data;
}

async function cancelOrder(id: string, token: string): Promise<Order> {
  const response = await fetch(`${API_BASE}/api/v1/orders/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ status: 'cancelled' }),
  });
  
  if (!response.ok) {
    throw new Error('取消订单失败');
  }
  
  const data = await response.json();
  return data.data;
}

// React Query Hooks
export function useOrders(userId: string, status?: string) {
  return useQuery({
    queryKey: ['orders', userId, status],
    queryFn: () => fetchOrders(userId, status),
    enabled: !!userId,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrder(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const token = localStorage.getItem('token') || '';
  const userId = localStorage.getItem('user_id') || '';
  
  return useMutation({
    mutationFn: (order: OrderInput) => createOrder(order, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', userId] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  const token = localStorage.getItem('token') || '';
  const userId = localStorage.getItem('user_id') || '';
  
  return useMutation({
    mutationFn: (id: string) => cancelOrder(id, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', userId] });
    },
  });
}