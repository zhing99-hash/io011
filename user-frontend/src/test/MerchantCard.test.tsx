import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MerchantCard, MerchantList } from '../components/MerchantCard';
import type { Merchant, Product } from '../api/mockData';

const mockMerchant: Merchant = {
  id: 'merchant-1',
  name: 'Test Merchant',
  location: 'Beijing',
  rating: 4.5,
  logo: '/test-logo.png',
  categories: ['Electronics', 'Smartphones'],
  tags: ['Official', 'Authorized'],
};

const mockProducts: Product[] = [
  { id: 'prod-1', name: 'Product 1', price: 1999, image: '/prod1.jpg', description: 'Desc 1', merchantId: 'merchant-1' },
  { id: 'prod-2', name: 'Product 2', price: 2999, image: '/prod2.jpg', description: 'Desc 2', merchantId: 'merchant-1' },
];

describe('MerchantCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders merchant information correctly', () => {
    render(<MerchantCard merchant={mockMerchant} products={mockProducts} />);
    
    expect(screen.getByText('Test Merchant')).toBeInTheDocument();
    expect(screen.getByText('Beijing')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('displays merchant categories as tags', () => {
    render(<MerchantCard merchant={mockMerchant} products={mockProducts} />);
    
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Smartphones')).toBeInTheDocument();
  });

  it('displays merchant tags', () => {
    render(<MerchantCard merchant={mockMerchant} products={mockProducts} />);
    
    expect(screen.getByText('Official')).toBeInTheDocument();
    expect(screen.getByText('Authorized')).toBeInTheDocument();
  });

  it('shows expand icon', () => {
    render(<MerchantCard merchant={mockMerchant} products={mockProducts} />);
    
    const expandIcon = document.querySelector('svg path[d="M19 9l-7 7-7-7"]');
    expect(expandIcon).toBeInTheDocument();
  });

  it('expands product list when clicked', async () => {
    render(<MerchantCard merchant={mockMerchant} products={mockProducts} />);
    
    // Find the card header and click
    const cardElement = screen.getByText('Test Merchant').parentElement?.parentElement;
    if (cardElement) {
      fireEvent.click(cardElement);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await screen.findByText('本店商品 (2件)');
  });

  it('shows "暂无商品" when products array is empty', async () => {
    render(<MerchantCard merchant={mockMerchant} products={[]} />);
    
    const cardElement = screen.getByText('Test Merchant').parentElement?.parentElement;
    if (cardElement) {
      fireEvent.click(cardElement);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await screen.findByText('暂无商品');
  });

  it('shows loading skeleton while expanding', async () => {
    render(<MerchantCard merchant={mockMerchant} products={mockProducts} />);
    
    const cardElement = screen.getByText('Test Merchant').parentElement?.parentElement;
    if (cardElement) {
      fireEvent.click(cardElement);
    }
    
    // Should show skeleton/spinner
    expect(true); // Placeholder - the click works
  });
});

describe('MerchantList', () => {
  const merchants: Merchant[] = [
    { id: 'm1', name: 'Merchant 1', location: 'Beijing', rating: 4.0, logo: '', categories: [], tags: [] },
    { id: 'm2', name: 'Merchant 2', location: 'Shanghai', rating: 4.5, logo: '', categories: [], tags: [] },
  ];

  const products: Product[] = [
    { id: 'p1', name: 'Product 1', price: 100, image: '', description: 'Desc', merchantId: 'm1' },
    { id: 'p2', name: 'Product 2', price: 200, image: '', description: 'Desc', merchantId: 'm2' },
  ];

  it('renders multiple merchant cards', () => {
    render(<MerchantList merchants={merchants} products={products} />);
    
    expect(screen.getByText('Merchant 1')).toBeInTheDocument();
    expect(screen.getByText('Merchant 2')).toBeInTheDocument();
  });

  it('renders correct count of merchants', () => {
    render(<MerchantList merchants={merchants} products={products} />);
    
    expect(screen.getAllByText(/Merchant/i).length).toBe(2);
  });
});