const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3003;

// Service URLs (will be container names in Docker)
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3000';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    service: 'API Gateway',
    version: '1.0.0',
    status: 'running',
    port: PORT,
    routes: {
      users: '/api/users',
      products: '/api/products',
      health: '/health'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'gateway-service'
  });
});

// Service health check endpoint
app.get('/health/services', async (req, res) => {
  const services = [];
  
  try {
    const userHealth = await axios.get(`${USER_SERVICE_URL}/health`, { timeout: 5000 });
    services.push({ name: 'user-service', status: 'healthy', url: USER_SERVICE_URL });
  } catch (error) {
    services.push({ name: 'user-service', status: 'unhealthy', url: USER_SERVICE_URL, error: error.message });
  }
  
  try {
    const productHealth = await axios.get(`${PRODUCT_SERVICE_URL}/health`, { timeout: 5000 });
    services.push({ name: 'product-service', status: 'healthy', url: PRODUCT_SERVICE_URL });
  } catch (error) {
    services.push({ name: 'product-service', status: 'unhealthy', url: PRODUCT_SERVICE_URL, error: error.message });
  }
  
  const allHealthy = services.every(service => service.status === 'healthy');
  
  res.status(allHealthy ? 200 : 503).json({
    gateway: 'healthy',
    services: services,
    timestamp: new Date().toISOString()
  });
});

// User service proxy routes
app.all('/api/users*', async (req, res) => {
  try {
    const path = req.path.replace('/api/users', '/users');
    const url = `${USER_SERVICE_URL}${path}`;
    
    const response = await axios({
      method: req.method,
      url: url,
      data: req.body,
      params: req.query,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers
      },
      timeout: 10000
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('User service error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(503).json({
        success: false,
        message: 'User service unavailable',
        error: error.message
      });
    }
  }
});

// Product service proxy routes
app.all('/api/products*', async (req, res) => {
  try {
    const path = req.path.replace('/api/products', '/products');
    const url = `${PRODUCT_SERVICE_URL}${path}`;
    
    const response = await axios({
      method: req.method,
      url: url,
      data: req.body,
      params: req.query,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers
      },
      timeout: 10000
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Product service error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(503).json({
        success: false,
        message: 'Product service unavailable',
        error: error.message
      });
    }
  }
});

// Combined data endpoint
app.get('/api/dashboard', async (req, res) => {
  try {
    const [usersResponse, productsResponse] = await Promise.all([
      axios.get(`${USER_SERVICE_URL}/users`, { timeout: 5000 }),
      axios.get(`${PRODUCT_SERVICE_URL}/products`, { timeout: 5000 })
    ]);
    
    res.json({
      success: true,
      data: {
        users: usersResponse.data,
        products: productsResponse.data,
        summary: {
          totalUsers: usersResponse.data.count || 0,
          totalProducts: productsResponse.data.count || 0,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error.message);
    res.status(503).json({
      success: false,
      message: 'Unable to fetch dashboard data',
      error: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    availableRoutes: [
      'GET /',
      'GET /health',
      'GET /health/services',
      'GET /api/dashboard',
      'ALL /api/users/*',
      'ALL /api/products/*'
    ]
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Gateway error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message
  });
});

app.listen(PORT, () => {
  console.log(`Gateway Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Dashboard: http://localhost:${PORT}/api/dashboard`);
  console.log(`User API: http://localhost:${PORT}/api/users`);
  console.log(`Product API: http://localhost:${PORT}/api/products`);
});
