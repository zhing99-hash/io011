/**
 * Merchant API Tests
 */

const { test } = require('tap');
const build = require('./helper');

test('POST /api/v1/merchants/register', async (t) => {
  const app = await build(t);
  
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/merchants/register',
    payload: {
      name: '测试商户',
      endpoint: 'wss://test.example.com/a2a',
      tags: {
        categories: ['茶具'],
        capabilities: ['支持定制'],
        location: '景德镇',
        price_range: { min: 50, max: 500 }
      }
    }
  });
  
  t.equal(response.statusCode, 200, 'returns a status code of 200');
  
  const payload = JSON.parse(response.payload);
  t.ok(payload.merchant_id, 'returns merchant_id');
  t.ok(payload.api_key, 'returns api_key');
  t.equal(payload.status, 'active', 'returns active status');
});

test('GET /api/v1/merchants/:id', async (t) => {
  const app = await build(t);
  
  // First create a merchant
  const createResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/merchants/register',
    payload: {
      name: '测试商户2',
      endpoint: 'wss://test2.example.com/a2a',
      tags: { categories: ['陶瓷'] }
    }
  });
  
  const { merchant_id } = JSON.parse(createResponse.payload);
  
  // Then get it
  const response = await app.inject({
    method: 'GET',
    url: `/api/v1/merchants/${merchant_id}`
  });
  
  t.equal(response.statusCode, 200);
  
  const payload = JSON.parse(response.payload);
  t.equal(payload.id, merchant_id);
  t.equal(payload.name, '测试商户2');
});
