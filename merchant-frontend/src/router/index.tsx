import { createBrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Products from '../pages/Products';
import ProductEdit from '../pages/ProductEdit';
import Tags from '../pages/Tags';
import Orders from '../pages/Orders';
import Analytics from '../pages/Analytics';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Dashboard />,
  },
  {
    path: '/products',
    element: <Products />,
  },
  {
    path: '/products/:id',
    element: <ProductEdit />,
  },
  {
    path: '/tags',
    element: <Tags />,
  },
  {
    path: '/orders',
    element: <Orders />,
  },
  {
    path: '/analytics',
    element: <Analytics />,
  },
]);

export default router;