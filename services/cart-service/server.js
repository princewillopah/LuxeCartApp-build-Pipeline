const express = require('express');
const cors = require('cors');
const redis = require('redis');
const promClient = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3004;

// Prometheus setup (single instance, top-level)
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379'
});

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('✅ Redis connected successfully'));

(async () => {
  await redisClient.connect();
})();

app.use(cors());
app.use(express.json());

// app.get('/health', (req, res) => {
//   res.json({ status: 'Cart Service is running with Redis' });
// });
app.get('/health', async (req, res) => {
  try {
    await redisClient.ping();
    res.json({ status: 'Cart Service is running with Redis' });
  } catch (e) {
    res.status(503).json({ status: 'unhealthy', error: 'Redis connection issue' });
  }
});
// Get user's cart
app.get('/:userId', async (req, res) => {
  try {
    const cartKey = `cart:${req.params.userId}`;
    const cart = await redisClient.get(cartKey);
    
    res.json({
      userId: req.params.userId,
      items: cart ? JSON.parse(cart) : []
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Add item to cart
app.post('/:userId/items', async (req, res) => {
  try {
    const { productId, quantity, price, name, image } = req.body;
    
    if (!productId || !quantity) {
      return res.status(400).json({ error: 'Product ID and quantity are required' });
    }

    const userId = req.params.userId;
    const cartKey = `cart:${userId}`;
    
    const existingCart = await redisClient.get(cartKey);
    let cart = existingCart ? JSON.parse(existingCart) : [];
    
    const existingIndex = cart.findIndex(item => item.productId === productId);
    
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({ productId, quantity, price, name, image });
    }
    
    await redisClient.setEx(cartKey, 604800, JSON.stringify(cart));
    res.json({ userId, items: cart });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Update item quantity
app.put('/:userId/items/:productId', async (req, res) => {
  try {
    const { quantity } = req.body;
    const userId = req.params.userId;
    const productId = req.params.productId;
    const cartKey = `cart:${userId}`;
    
    const existingCart = await redisClient.get(cartKey);
    if (!existingCart) return res.status(404).json({ error: 'Cart not found' });
    
    let cart = JSON.parse(existingCart);
    const itemIndex = cart.findIndex(item => item.productId === productId);
    
    if (itemIndex === -1) return res.status(404).json({ error: 'Item not found in cart' });
    
    quantity <= 0 ? cart.splice(itemIndex, 1) : (cart[itemIndex].quantity = quantity);
    
    await redisClient.setEx(cartKey, 604800, JSON.stringify(cart));
    res.json({ userId, items: cart });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Remove item from cart
app.delete('/:userId/items/:productId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const productId = req.params.productId;
    const cartKey = `cart:${userId}`;
    
    const existingCart = await redisClient.get(cartKey);
    if (!existingCart) return res.status(404).json({ error: 'Cart not found' });
    
    let cart = JSON.parse(existingCart).filter(item => item.productId !== productId);
    await redisClient.setEx(cartKey, 604800, JSON.stringify(cart));
    
    res.json({ userId, items: cart });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// Clear cart (FIXED: complete implementation)
app.delete('/:userId', async (req, res) => {
  try {
    const cartKey = `cart:${req.params.userId}`;
    await redisClient.del(cartKey);
    res.json({ userId: req.params.userId, items: [], message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

// Start server (single instance, at EOF)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Cart Service running on port ${PORT} with Redis`);
});