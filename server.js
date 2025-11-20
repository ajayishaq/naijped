// server.js
// Simple Express server to proxy NewsData and OpenAI calls.
// Usage: set OPENAI_API_KEY and NEWSDATA_API_KEY environment variables.

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // In production, restrict origins to your domain
app.use(express.json());

// Optionally serve the index.html from the same server (uncomment if desired)
// app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory cache for news to reduce rate usage
let newsCache = { data: null, ts: 0 };
const NEWS_TTL_MS = 60 * 1000; // 60 seconds

// /api/news proxies to newsdata.io
// Example: GET /api/news?country=ng&language=en&size=15
app.get('/api/news', async (req, res) => {
  try {
    const now = Date.now();
    if (newsCache.data && (now - newsCache.ts) < NEWS_TTL_MS) {
      return res.json(newsCache.data);
    }

    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'NEWSDATA_API_KEY not configured' });

    const params = new URLSearchParams({ apikey: apiKey, ...req.query }).toString();
    const endpoint = `https://newsdata.io/api/1/news?${params}`;

    const response = await fetch(endpoint);
    if (!response.ok) {
      const text = await response.text();
      console.error('News provider error:', response.status, text);
      return res.status(502).json({ error: 'News provider error', details: text });
    }
    const data = await response.json();

    newsCache = { data, ts: Date.now() };
    return res.json(data);
  } catch (err) {
    console.error('News proxy error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// /api/ai-summary calls OpenAI Chat Completions.
// Expects POST { query: string, wikiResults: [{title,snippet,url}] }
app.post('/api/ai-summary', async (req, res) => {
  try {
    const { query, wikiResults } = req.body || {};
    if (!query) return res.status(400).json({ error: 'Missing query' });

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

    const context = (Array.isArray(wikiResults) && wikiResults.length)
      ? wikiResults.map(r => `${r.title}: ${r.snippet}`).join('\n\n')
      : '';

    const prompt = context
      ? `Based on the following Wikipedia information about "${query}", provide a comprehensive but concise summary in 2-3 paragraphs. Focus on key facts and historical significance relevant to Nigeria.\n\n${context}`
      : `Provide a comprehensive but concise summary about "${query}" in 2-3 paragraphs, focusing on its significance to Nigeria.`;

    const payload = {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a knowledgeable assistant specializing in Nigerian history, culture, and current affairs. Provide informative, accurate summaries.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('OpenAI error:', response.status, text);
      return res.status(502).json({ error: 'AI provider error', details: text });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || '';
    return res.json({ summary });
  } catch (err) {
    console.error('AI summary handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Optional: health check
app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
