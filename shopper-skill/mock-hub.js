/**
 * Mock Hub Service for IO011 Shopper Integration Test
 * 模拟Hub API，用于联调测试
 */

const http = require('http');
const url = require('url');

const PORT = 8080;

// Mock商户数据
const mockMerchants = [
  {
    id: 'mer_tea_001',
    name: '茶韵轩',
    logo_url: 'https://example.com/logo1.png',
    endpoint: 'wss://mock-merchant1.io011.com/a2a',
    tags: {
      categories: ['茶具', '茶杯', '茶壶'],
      capabilities: ['紫砂', '手工'],
      price_range: { min: 50, max: 500 }
    },
    reputation: { score: 4.8, transactions: 1200 },
    status: 'active'
  },
  {
    id: 'mer_tea_002',
    name: '茗香阁',
    logo_url: 'https://example.com/logo2.png',
    endpoint: 'wss://mock-merchant2.io011.com/a2a',
    tags: {
      categories: ['茶具', '茶叶', '陶瓷'],
      capabilities: ['批发', '定制'],
      price_range: { min: 30, max: 300 }
    },
    reputation: { score: 4.6, transactions: 800 },
    status: 'active'
  },
  {
    id: 'mer_tea_003',
    name: '清茶馆',
    logo_url: 'https://example.com/logo3.png',
    endpoint: 'wss://mock-merchant3.io011.com/a2a',
    tags: {
      categories: ['茶具', '玻璃', '现代'],
      capabilities: ['包邮', '48小时发货'],
      price_range: { min: 20, max: 200 }
    },
    reputation: { score: 4.5, transactions: 600 },
    status: 'active'
  },
  {
    id: 'mer_tea_004',
    name: '紫砂之家',
    logo_url: 'https://example.com/logo4.png',
    endpoint: 'wss://mock-merchant4.io011.com/a2a',
    tags: {
      categories: ['茶壶', '紫砂'],
      capabilities: ['名家制作', '收藏级'],
      price_range: { min: 200, max: 2000 }
    },
    reputation: { score: 4.9, transactions: 300 },
    status: 'active'
  }
];

const server = http.createServer((req, res) => {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

  // Health check
  if (pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      version: '2.2.1-mock',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Search API - GET /api/v1/search
  if (pathname === '/api/v1/search' && req.method === 'GET') {
    const tags = query.tags ? query.tags.split(',') : [];
    const category = query.category;
    const minPrice = query.min_price ? parseInt(query.min_price) : null;
    const maxPrice = query.max_price ? parseInt(query.max_price) : null;
    const limit = query.limit ? parseInt(query.limit) : 10;

    console.log(`  Search params:`, { tags, category, minPrice, maxPrice, limit });

    // 过滤商户
    let results = mockMerchants.filter(m => {
      // 标签匹配
      const allTags = [...(m.tags.categories || []), ...(m.tags.capabilities || [])];
      const hasMatchingTag = tags.length === 0 || tags.some(t => allTags.includes(t));
      
      // 类目匹配
      const hasMatchingCategory = !category || m.tags.categories.includes(category);
      
      // 价格匹配
      const priceMin = m.tags.price_range?.min || 0;
      const priceMax = m.tags.price_range?.max || Infinity;
      const matchesPrice = (!minPrice || priceMax >= minPrice) && 
                          (!maxPrice || priceMin <= maxPrice);

      return hasMatchingTag && hasMatchingCategory && matchesPrice;
    });

    // 限制数量
    results = results.slice(0, limit);

    const response = {
      merchants: results.map(m => ({
        id: m.id,
        name: m.name,
        logo_url: m.logo_url,
        endpoint: m.endpoint,
        reputation: m.reputation,
        match_tags: tags.filter(t => 
          m.tags.categories?.includes(t) || m.tags.capabilities?.includes(t)
        )
      })),
      total: results.length,
      query: { tags, category, min_price: minPrice, max_price: maxPrice }
    };

    console.log(`  Found ${results.length} merchants:`, results.map(m => m.name));

    res.writeHead(200);
    res.end(JSON.stringify(response));
    return;
  }

  // Register merchant - POST /api/v1/merchants/register
  if (pathname === '/api/v1/merchants/register' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('  Register merchant:', data.name);
        
        const newMerchant = {
          merchant_id: `mer_${Date.now()}`,
          api_key: `sk_live_${Date.now()}`,
          status: 'active',
          message: 'Merchant registered successfully'
        };

        res.writeHead(201);
        res.end(JSON.stringify(newMerchant));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not Found', path: pathname }));
});

server.listen(PORT, () => {
  console.log(`============================================`);
  console.log(`  Mock Hub Server Running`);
  console.log(`  Port: ${PORT}`);
  console.log(`============================================`);
  console.log(`  Endpoints:`);
  console.log(`  - Health:  http://localhost:${PORT}/health`);
  console.log(`  - Search:  http://localhost:${PORT}/api/v1/search?tags=茶具`);
  console.log(`============================================`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down mock hub...');
  server.close(() => {
    process.exit(0);
  });
});