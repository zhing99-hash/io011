import { createBrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Merchants from '../pages/Merchants';
import MerchantDetail from '../pages/MerchantDetail';
import Tags from '../pages/Tags';
import Settings from '../pages/Settings';
import Layout from '../components/Layout';
import HubLayout from '../components/HubLayout';
import HubHome from '../pages/HubHome';
import HubMerchants from '../pages/HubMerchants';
import HubDocs from '../pages/HubDocs';

const router = createBrowserRouter([
  // ========== 展示中心 (www.io011.com) ==========
  {
    path: '/',
    element: <HubLayout />,
    children: [
      {
        index: true,
        element: <HubHome />,
      },
      {
        path: 'merchants',
        element: <HubMerchants />,
      },
      {
        path: 'docs',
        element: <HubDocs />,
      },
    ],
  },

  // ========== Hub 后台管理 (hub-admin.io011.com:1568) ==========
  {
    path: '/admin',
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

  // ========== 登录 ==========
  {
    path: '/login',
    element: <Login />,
  },
]);

export default router;