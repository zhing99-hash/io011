export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  image?: string;
  description?: string;
}

export interface ProductsFilter {
  search: string;
  status: 'all' | 'active' | 'inactive';
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  status: OrderStatus;
  total: number;
  date: string;
}

export interface OrdersFilter {
  status: OrderStatus | 'all';
  timeRange: 'all' | 'today' | '7days' | '30days';
  search: string;
}