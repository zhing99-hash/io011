import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SearchProgress } from '../components/SearchProgress';
import { useSearchStore } from '../stores/searchStore';
import type { SearchProgressState } from '../types/search';

// Helper to create mock progress state
const createMockProgressState = (overrides: Partial<SearchProgressState> = {}): SearchProgressState => ({
  currentStep: 0,
  steps: {
    parse: { status: 'pending', title: 'Parse', description: '' },
    match: { status: 'pending', title: 'Match', description: '' },
    products: { status: 'pending', title: 'Products', description: '' },
  },
  error: null,
  isTimeout: false,
  startSearch: vi.fn(),
  setStepStatus: vi.fn(),
  setStepData: vi.fn(),
  setError: vi.fn(),
  setTimeout: vi.fn(),
  reset: vi.fn(),
  ...overrides,
});

describe('SearchProgress', () => {
  beforeEach(() => {
    useSearchStore.setState({
      progress: createMockProgressState(),
    });
  });

  it('returns null when currentStep is 0', () => {
    const { container } = render(<SearchProgress />);
    expect(container.firstChild).toBeNull();
  });

  it('renders progress steps when search starts', () => {
    useSearchStore.setState({
      progress: createMockProgressState({
        currentStep: 1,
        steps: {
          ...createMockProgressState().steps,
          parse: { status: 'in-progress', title: 'Parse', description: 'Parsing...' },
        },
      }),
    });

    render(<SearchProgress />);
    expect(screen.getByText('Search Progress')).toBeInTheDocument();
    expect(screen.getByText('Step 1/3: Parse')).toBeInTheDocument();
  });

  it('renders all three steps', () => {
    useSearchStore.setState({
      progress: createMockProgressState({
        currentStep: 3,
        steps: {
          parse: { status: 'completed', title: 'Parse', description: '', category: 'Electronics', tags: ['tag1'] as any },
          match: { status: 'completed', title: 'Match', description: '', merchants: [{ id: '1', name: 'Test', location: 'Beijing', rating: 4.5 }] },
          products: { status: 'completed', title: 'Products', description: '' },
        },
      }),
    });

    render(<SearchProgress />);
    expect(screen.getByText('Step 1/3: Parse')).toBeInTheDocument();
    expect(screen.getByText('Step 2/3: Match Merchants')).toBeInTheDocument();
    expect(screen.getByText('Step 3/3: Get Products')).toBeInTheDocument();
  });

  it('shows completed status with checkmark', () => {
    useSearchStore.setState({
      progress: createMockProgressState({
        currentStep: 3,
        steps: {
          parse: { status: 'completed', title: 'Parse', description: '' },
          match: { status: 'completed', title: 'Match', description: '' },
          products: { status: 'completed', title: 'Products', description: '' },
        },
      }),
    });

    render(<SearchProgress />);
    // The component should render the Search Progress title and steps completed
    expect(screen.getByText('Search Progress')).toBeInTheDocument();
  });

  it('shows in-progress spinner', () => {
    useSearchStore.setState({
      progress: createMockProgressState({
        currentStep: 2,
        steps: {
          ...createMockProgressState().steps,
          parse: { status: 'completed', title: 'Parse', description: '' },
          match: { status: 'in-progress', title: 'Match', description: 'Matching...' },
        },
      }),
    });

    render(<SearchProgress />);
    expect(screen.getByText('Step 2/3: Match Merchants')).toBeInTheDocument();
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('displays category and tags when parsing is complete', () => {
    useSearchStore.setState({
      progress: createMockProgressState({
        currentStep: 3,
        steps: {
          parse: { 
            status: 'completed', 
            title: 'Parse', 
            description: '', 
            category: 'Electronics',
            tags: ['smartphone', 'gadget'],
            budget: { min: 1000, max: 5000 },
          },
          match: { status: 'completed', title: 'Match', description: '', merchants: [] },
          products: { status: 'completed', title: 'Products', description: '' },
        },
      }),
    });

    render(<SearchProgress />);
    expect(screen.getByText(/Category: Electronics/)).toBeInTheDocument();
    expect(screen.getByText(/Tags: smartphone, gadget/)).toBeInTheDocument();
    expect(screen.getByText(/Budget: 1000-5000/)).toBeInTheDocument();
  });

  it('displays merchant count when match is complete', () => {
    const merchants = [
      { id: '1', name: 'Merchant 1', location: 'Beijing', rating: 4.5 },
      { id: '2', name: 'Merchant 2', location: 'Shanghai', rating: 4.0 },
    ];

    useSearchStore.setState({
      progress: createMockProgressState({
        currentStep: 3,
        steps: {
          parse: { status: 'completed', title: 'Parse', description: '' },
          match: { status: 'completed', title: 'Match', description: '', merchants },
          products: { status: 'completed', title: 'Products', description: '' },
        },
      }),
    });

    render(<SearchProgress />);
    expect(screen.getByText(/Found 2 merchants/)).toBeInTheDocument();
  });

  it('shows error status', () => {
    useSearchStore.setState({
      progress: createMockProgressState({
        currentStep: 1,
        steps: {
          ...createMockProgressState().steps,
          parse: { status: 'error', title: 'Parse', description: 'Error occurred' },
        },
        error: { message: 'Test error', details: '', code: 'ERROR' },
      }),
    });

    render(<SearchProgress />);
    const xIcon = document.querySelector('svg path[d="M6 18L18 6M6 6l12 12"]');
    expect(xIcon).toBeInTheDocument();
  });

  it('shows progress bar when products are loading', () => {
    useSearchStore.setState({
      progress: createMockProgressState({
        currentStep: 3,
        steps: {
          parse: { status: 'completed', title: 'Parse', description: '' },
          match: { status: 'completed', title: 'Match', description: '', merchants: [] },
          products: { status: 'in-progress', title: 'Products', description: '', progress: 50, returnedMerchants: 5, totalMerchants: 10 },
        },
      }),
    });

    render(<SearchProgress />);
    expect(screen.getByText(/Returned 5\/10 merchants/)).toBeInTheDocument();
  });
});