const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3007;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'Rating Service is running' });
});

// Helper to update product rating
async function updateProductRating(productId) {
  const result = await pool.query(
    `SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as total_reviews
     FROM ratings 
     WHERE product_id = $1`,
    [productId]
  );
  
  const exactAvg = parseFloat(result.rows[0].avg_rating || 0);
  const roundedRating = Math.round(exactAvg); // Round to nearest whole number
  const totalReviews = parseInt(result.rows[0].total_reviews || 0);
  
  await pool.query(
    `UPDATE products 
     SET average_rating = $1, total_reviews = $2, updated_at = NOW()
     WHERE id = $3`,
    [roundedRating, totalReviews, productId]
  );
  
  console.log(`Updated product ${productId}: ${exactAvg.toFixed(2)} average → ${roundedRating} stars (rounded) from ${totalReviews} ratings`);
  
  return { avgRating: roundedRating, exactAvg, totalRatings: totalReviews };
}

// Submit or update rating
app.post('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { userId, rating } = req.body;
    
    if (!userId || !rating) {
      return res.status(400).json({ error: 'userId and rating are required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Upsert rating (insert or update if exists)
    await pool.query(
      `INSERT INTO ratings (product_id, user_id, rating)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, user_id)
       DO UPDATE SET rating = $3, created_at = NOW()`,
      [productId, userId, rating]
    );
    
    // Update product average rating
    const updated = await updateProductRating(productId);
    
    res.json({
      message: 'Rating submitted',
      productId,
      userId,
      rating,
      avgRating: updated.avgRating,
      totalRatings: updated.totalRatings
    });
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// Get user's rating for a product
app.get('/product/:productId/user/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT rating, created_at FROM ratings WHERE product_id = $1 AND user_id = $2',
      [req.params.productId, req.params.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rating not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get rating error:', error);
    res.status(500).json({ error: 'Failed to get rating' });
  }
});

// Get all ratings for a product
app.get('/product/:productId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.first_name, u.last_name, u.email
       FROM ratings r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.productId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ error: 'Failed to get ratings' });
  }
});

// Get rating distribution for a product
app.get('/product/:productId/distribution', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        rating,
        COUNT(*) as count
       FROM ratings
       WHERE product_id = $1
       GROUP BY rating
       ORDER BY rating DESC`,
      [req.params.productId]
    );
    
    // Create distribution object
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    result.rows.forEach(row => {
      distribution[row.rating] = parseInt(row.count);
    });
    
    res.json(distribution);
  } catch (error) {
    console.error('Get distribution error:', error);
    res.status(500).json({ error: 'Failed to get distribution' });
  }
});

// Prometheus metrics
const promClient = require('prom-client');
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(PORT, () => {
  console.log(`Rating Service running on port ${PORT}`);
});
