import Layout from '../components/Layout';

export default function Dashboard() {
  const stats = [
    { label: '今日订单', value: '128', change: '+12%' },
    { label: '今日营收', value: '¥8,640', change: '+8%' },
    { label: '商品数量', value: '456', change: '+5%' },
    { label: '用户数量', value: '2,340', change: '+15%' },
  ];

  return (
    <Layout activePath="/">
      <h2 className="text-2xl font-bold mb-6">仪表盘</h2>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            <span className="text-green-500 text-sm">{stat.change} 较昨日</span>
          </div>
        ))}
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="font-semibold mb-4">最近订单</h3>
        <p className="text-gray-500">暂无最近订单数据</p>
      </div>
    </Layout>
  );
}