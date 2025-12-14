// server.js - Simple Node.js backend for Naijpedia
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const NEWSAPI_KEY = '9f23e54123ae46c19510711d0f7ef620';

// Enable CORS for all routes
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve your HTML file from 'public' folder

// News API proxy endpoint
app.get('/api/news', async (req, res) => {
  try {
    const url = `https://newsapi.org/v2/top-headlines?country=ng&apiKey=${NEWSAPI_KEY}&pageSize=15`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'ok') {
      throw new Error('NewsAPI error: ' + (data.message || 'Unknown error'));
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Naijpedia API is running' });
});

app.listen(PORT, () => {
  console.log(`Naijpedia backend running on http://localhost:${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api/news`);
});
