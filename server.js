require('dotenv').config(); // loads .env for local development only
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const NEWS_TTL_MS = Number(process.env.NEWS_TTL_MS || 60) * 1000; // seconds -> ms
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'; // set to your domain in production
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'; // set to gpt-4 if you have access

app.use(express.json());
app.use(cors({ origin: ALLOWED_ORIGIN }));

// Serve static frontend from ./public (move your index.html to public/index.html)
app.use(express.static(path.join(__dirname, 'public')));

// fallback so visiting root serves index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let newsCache = { data: null, ts: 0 };

app.get('/api/news', async (req, res) => {
  try {
    const now = Date.now();
    if (newsCache.data && (now - newsCache.ts) < NEWS_TTL_MS) return res.json(newsCache.data);
    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'NEWSDATA_API_KEY not configured' });
    const params = new URLSearchParams({ apikey: apiKey, ...req.query }).toString();
    const endpoint = `https://newsdata.io/api/1/news?${params}`;
    const response = await fetch(endpoint);
    if (!response.ok) { const text = await response.text(); console.error('News provider error:', response.status, text); return res.status(502).json({ error: 'News provider error', details: text }); }
    const data = await response.json();
    newsCache = { data, ts: Date.now() };
    return res.json(data);
  } catch (err) { console.error('News proxy error:', err); return res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/ai-summary', async (req, res) => {
  try {
    const { query, wikiResults } = req.body || {};
    if (!query) return res.status(400).json({ error: 'Missing query' });
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    const context = (Array.isArray(wikiResults) && wikiResults.length) ? wikiResults.map(r => `${r.title}: ${r.snippet}`).join('\n\n') : '';
    const prompt = context ? `Based on the following Wikipedia information about "${query}", provide a concise 2-3 paragraph summary focusing on key facts and historical/cultural significance relevant to Nigeria.\n\n${context}` : `Provide a concise 2-3 paragraph summary about "${query}", focusing on significance to Nigeria.`;
    const messages = [
      { role: 'system', content: 'You are a knowledgeable assistant specializing in Nigerian history, culture, and current affairs. Provide informative, accurate summaries.' },
      { role: 'user', content: prompt }
    ];
    const payload = { model: OPENAI_MODEL, messages, max_tokens: 500, temperature: 0.7 };
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify(payload)
    });
    if (!response.ok) { const text = await response.text(); console.error('OpenAI error:', response.status, text); return res.status(502).json({ error: 'AI provider error', details: text }); }
    const data = await response.json();
    const summary = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    return res.json({ summary });
  } catch (err) { console.error('AI summary handler error:', err); return res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
