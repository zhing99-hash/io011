import { createBrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Merchants from '../pages/Merchants';
import MerchantDetail from '../pages/MerchantDetail';
import Tags from '../pages/Tags';
import Settings from '../pages/Settings';
import Layout from '../components/Layout';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'merchants',
        element: <Merchants />,
      },
      {
        path: 'merchants/:id',
        element: <MerchantDetail />,
      },
      {
        path: 'tags',
        element: <Tags />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
]);

export default router;