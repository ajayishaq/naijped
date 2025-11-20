# Naijpedia — Backend + Client (Ready to deploy)

This repo contains the frontend (index.html) and a simple Node/Express backend (server.js) that proxies:
- NewsData API requests (so the API key is not exposed to the browser)
- OpenAI Chat Completions (so the OpenAI key is kept server-side)

Files included:
- index.html — Updated client which calls local endpoints `/api/news` and `/api/ai-summary`
- server.js — Express server with endpoints /api/news and /api/ai-summary
- package.json — dependencies and start scripts
- .env.example — environment variable examples
- .gitignore — ignore node_modules and .env

Security & usage
- Do NOT put API keys directly in index.html or commit them to GitHub.
- Set the keys as environment variables (see .env.example):
  - OPENAI_API_KEY
  - NEWSDATA_API_KEY

Quick start (local)
1. Copy .env.example to .env and fill the keys:
   - OPENAI_API_KEY=sk-...
   - NEWSDATA_API_KEY=pub_...
2. Install:
   - npm install
3. Run:
   - npm start
4. Open http://localhost:3000 and the HTML file directly (you can serve index.html via a static hosting or place it in a public folder). For development, run the server and open index.html from filesystem or configure Express to serve static files.

Recommended production deployments
- Render / Railway / Heroku: Run the Express server (server.js). Host the frontend files in the same server (serve static) or use GitHub Pages for static site and point client to your deployed backend.
- Vercel / Netlify serverless: If you prefer serverless, I can convert `server.js` into two serverless functions: `api/news` and `api/ai-summary`. For Vercel, you can deploy the static index.html to the same project and add the serverless functions.

Notes
- The backend uses a small in-memory cache for news (default 60s). Increase TTL for lower API usage.
- Restrict CORS in production to your domain.
- For cost control, consider limiting or rate-limiting AI calls in the server.

If you'd like, I can:
- Create a PR with these files added to your repository.
- Convert the backend into Vercel/Netlify serverless functions and provide the function files.
- Add a GitHub Actions workflow for deploy to Render/Heroku.

Tell me which deployment target you'd prefer and I’ll either add the serverless function conversion or prepare a small deploy script for your chosen provider.
