# Infra & Deployment Guide

Owned by: AI / Deployment teammate.

## Deployment Setup

### 1. Backend (Render / Railway)
- **Host**: Render Free Web Service
- **Root Directory**: `backend` (or leave default root and use `uvicorn backend.app.main:app`)
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `ANTHROPIC_API_KEY`: Set your Anthropic API key in the host dashboard environment settings (never commit to git).
  - `PYTHON_VERSION`: `3.11.0`

### 2. Frontend (Vercel / Netlify)
- **Host**: Vercel Free Tier
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**: `VITE_API_BASE_URL` set to the deployed backend Render URL (e.g., `https://router-health-360-backend.onrender.com`).

### 3. Live Production URLs
- **Backend API**: `https://router-health-360-backend.onrender.com` (Update root README.md upon live deploy)
- **Frontend App**: `https://router-health-360.vercel.app` (Update root README.md upon live deploy)
