# YAML Guard - $0 SaaS Deployment Guide

## Quick Deploy (Free Tier)

### Backend (Render.com)
1. Push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → "New Web Service"
3. Connect your GitHub repo and select this project
4. Render will auto-detect `render.yaml` configuration
5. Click "Create Web Service"
6. Note the final API URL (e.g., `https://yaml-guard-api.onrender.com`)

### Frontend (Cloudflare Pages)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages → "Create a project"
2. Connect GitHub repo and select the `ui/` folder
3. Build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Environment variables:
   - **VITE_API_URL**: `https://yaml-guard-api.onrender.com` (your Render URL)
5. Deploy

Your app will be live at: `https://your-project.pages.dev`

## Local Development

### Backend
```bash
uvicorn yamlguard.server.main:app --reload --port 8000
```

### Frontend
```bash
cd ui
npm install
npm run dev
```

The frontend will automatically connect to `http://localhost:8000` in dev mode.

## Environment Variables

### Backend (Render)
- `ALLOWED_ORIGINS`: `*` (or specific domains for production)
- `MAX_BYTES`: `2000000` (2MB request limit)
- `RL_WINDOW_SECONDS`: `60` (rate limit window)
- `RL_MAX_REQUESTS`: `120` (requests per window)

### Frontend (Cloudflare Pages)
- `VITE_API_URL`: Your Render backend URL

## Custom Domain (Optional)
1. In Cloudflare Pages → Settings → Custom domains
2. Add your domain
3. Update DNS in Cloudflare to point to Pages

## Cost
- **Render**: Free tier (750 hours/month, auto-sleep after inactivity)
- **Cloudflare Pages**: Free tier (unlimited bandwidth, 500 builds/month)
- **Total**: $0/month