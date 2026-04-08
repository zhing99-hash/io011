import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from '../pages/Home';
import UserLogin from '../pages/UserLogin';
import UserOrders from '../pages/UserOrders';
import UserProfile from '../pages/UserProfile';
import UserMerchants from '../pages/UserMerchants';
import Developing from '../pages/Developing';
import UserLayout from '../components/UserLayout';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <UserLogin />,
  },
  {
    path: '/',
    element: <UserLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'orders', element: <UserOrders /> },
      { path: 'profile', element: <UserProfile /> },
      { path: 'merchants', element: <UserMerchants /> },
      { path: 'developing', element: <Developing /> },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
