const express = require('express');
const cors = require('cors');
const multer = require('multer');
const AWS = require('aws-sdk');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3011;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'ecommerce-product-images';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'Image Upload Service is running' });
});

// Upload image to S3
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `products/${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;

    // Upload to S3
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read' // Make publicly accessible
    };

    const result = await s3.upload(params).promise();

    res.json({
      success: true,
      url: result.Location,
      key: result.Key
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: error.message 
    });
  }
});

// Delete image from S3
app.delete('/delete/:key', async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key);

    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(params).promise();

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: 'Failed to delete image',
      details: error.message 
    });
  }
});

// Fallback for base64 images (when S3 not configured)
app.post('/upload/base64', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // In production with S3, convert base64 to buffer and upload
    // For now, just return the base64 string
    res.json({
      success: true,
      url: image,
      type: 'base64'
    });
  } catch (error) {
    console.error('Base64 upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process image',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Image Upload Service running on port ${PORT}`);
  console.log(`AWS S3 Bucket: ${BUCKET_NAME}`);
  console.log(`AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
});
