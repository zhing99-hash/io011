/**
 * IO011 商户端 API 服务 v2.3.5
 * 对接 Hub 后端 API (端口 1569)
 */

const API_BASE = 'https://api.io011.com/api/v1';

// 存储配置
let config = {
  baseUrl: API_BASE,
  merchantId: null,
  apiKey: null
};

/**
 * 初始化配置
 */
function init(merchantId, apiKey) {
  config.merchantId = merchantId;
  config.apiKey = apiKey;
  saveConfig();
}

function getConfig() {
  loadConfig();
  return config;
}

function saveConfig() {
  localStorage.setItem('io011_merchant_config', JSON.stringify(config));
}

function loadConfig() {
  const saved = localStorage.getItem('io011_merchant_config');
  if (saved) {
    try {
      config = { ...config, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Failed to load config:', e);
    }
  }
}

function clearConfig() {
  config = { baseUrl: API_BASE, merchantId: null, apiKey: null };
  localStorage.removeItem('io011_merchant_config');
}

/**
 * 通用请求方法
 */
async function request(endpoint, options = {}) {
  const url = `${config.baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// ==================== 认证模块 ====================

/**
 * 商户登录
 */
async function login(merchantId, password) {
  const data = await request('/auth/merchant/login', {
    method: 'POST',
    body: JSON.stringify({ merchant_id: merchantId, password })
  });

  // 处理两种响应格式
  // 格式1: { success: true, token: "...", merchant: {...} }
  // 格式2: { success: true, data: { token: "...", merchant: {...} } }
  const token = data.token || data.data?.token;
  const merchant = data.merchant || data.data?.merchant;
  
  if (data.success && token) {
    init(merchantId, token);
    return { success: true, token, merchant };
  }

  throw new Error(data.message || '登录失败');
}

/**
 * 验证登录状态
 */
async function verifyLogin() {
  if (!config.merchantId || !config.apiKey) {
    return false;
  }

  try {
    const data = await request(`/auth/merchant/verify`, {
      method: 'POST'
    });
    return data.success;
  } catch (error) {
    console.error('Verify failed:', error);
    return false;
  }
}

/**
 * 退出登录
 */
function logout() {
  clearConfig();
  localStorage.removeItem('merchant_token');
}

// ==================== 商户信息 ====================

/**
 * 获取商户信息
 */
async function getMerchantInfo() {
  return request(`/merchants/${config.merchantId}`);
}

/**
 * 更新商户信息
 */
async function updateMerchantInfo(updates) {
  return request(`/merchants/${config.merchantId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

// ==================== 商品模块 ====================

/**
 * 获取商品列表
 */
async function getProducts(params = {}) {
  const query = new URLSearchParams({
    merchant_id: config.merchantId,
    ...params
  }).toString();

  const result = await request(`/products?${query}`);
  
  // 兼容两种返回格式
  // 格式1: { products: [...] }
  // 格式2: { success: true, data: { products: [...] } }
  const products = result.products || result.data?.products || [];
  return { products };
}

/**
 * 获取单个商品
 */
async function getProduct(id) {
  const result = await request(`/products/${id}`);
  return result.data || result;
}

/**
 * 创建商品
 */
async function createProduct(productData) {
  const result = await request('/products', {
    method: 'POST',
    body: JSON.stringify({
      ...productData,
      merchant_id: config.merchantId
    })
  });
  return result.data || result;
}

/**
 * 更新商品
 */
async function updateProduct(id, productData) {
  const result = await request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData)
  });
  return result.data || result;
}

/**
 * 删除商品
 */
async function deleteProduct(id) {
  return request(`/products/${id}`, {
    method: 'DELETE'
  });
}

/**
 * 上架/下架商品
 */
async function toggleProductStatus(id, status) {
  const result = await request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
  return result.data || result;
}

// ==================== 订单模块 ====================

/**
 * 获取订单列表
 */
async function getOrders(params = {}) {
  // 先尝试 /api/orders/<merchant_id> 格式（某些版本用这个）
  try {
    const result = await request(`/orders?merchant_id=${config.merchantId}`);
    // 兼容返回格式
    const orders = result.orders || result.data?.orders || result.data || [];
    return { orders };
  } catch (e) {
    console.error('getOrders error:', e);
    return { orders: [] };
  }
}

/**
 * 获取订单详情
 */
async function getOrder(id) {
  const result = await request(`/orders/${id}`);
  return result.data || result;
}

/**
 * 更新订单状态
 */
async function updateOrderStatus(id, status, tracking = null) {
  const result = await request(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status, tracking_number: tracking })
  });
  return result.data || result;
}

// ==================== 导出 ====================

window.IO011API = {
  config,
  init,
  getConfig,
  login,
  verifyLogin,
  logout,
  getMerchantInfo,
  updateMerchantInfo,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  getOrders,
  getOrder,
  updateOrderStatus
};