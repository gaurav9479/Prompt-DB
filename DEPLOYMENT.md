# Deployment Guide: Frontend on Vercel & Backend on Render

This project is structured as a separate frontend (React + Vite) and backend (FastAPI + Python). This guide outlines the steps to deploy them to Vercel and Render respectively with separate environment variables.

---

## 1. Backend Deployment (Render)

Render is a cloud hosting platform suited for FastAPI python backends.

### Step-by-Step Instructions:

1. **Sign Up/Log In**: Go to [Render](https://render.com) and connect your GitHub repository.
2. **Create Web Service**: Click **New +** and select **Web Service**.
3. **Repository**: Select this repository.
4. **Configuration Settings**:
   - **Name**: e.g., `prompt-db-backend`
   - **Environment**: `Python 3`
   - **Region**: Choose the region closest to your database.
   - **Branch**: `main`
   - **Root Directory**: `backend` (as shown in your Render settings)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `PYTHONPATH=.. uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
     *(Note: `PYTHONPATH=..` is required because the backend codebase uses absolute imports prefixed with `backend.`)*
5. **Environment Variables**:
   Click **Advanced** -> **Add Environment Variable** and add the following variables:
   - `DATABASE_URL`: Your PostgreSQL database URL (e.g. Neon, Supabase, Render PostgreSQL).
   - `GEMINI_API_KEY`: Your Gemini API key.
   - `GROQ_API_KEY`: Your Groq API key.
   - `FERNET_SECRET_KEY`: A secure random secret key. You can generate one locally using:
     ```bash
     python -c "import secrets; print(secrets.token_urlsafe(32))"
     ```
   - `CORS_ORIGINS`: Your Vercel frontend URL once deployed (e.g., `https://your-frontend-app.vercel.app`). You can also include `http://localhost:5173` for local testing. Separate multiple origins with commas.
6. **Deploy**: Click **Create Web Service**. Note your backend service URL (e.g. `https://prompt-db-backend.onrender.com`).

---

## 2. Frontend Deployment (Vercel)

Vercel is optimized for building and hosting static assets and Vite applications.

### Step-by-Step Instructions:

1. **Sign Up/Log In**: Go to [Vercel](https://vercel.com) and connect your GitHub repository.
2. **Import Project**: Click **Add New...** -> **Project** and select this repository.
3. **Configure Project**:
   - **Framework Preset**: `Vite` (Vercel will auto-detect this).
   - **Root Directory**: Click **Edit** and select the `frontend` folder.
   - **Build and Development Settings**: Use defaults:
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`
4. **Environment Variables**:
   Under **Environment Variables**, add the following keys:
   - `VITE_API_URL`: Set this to your backend service URL on Render (e.g. `https://prompt-db-backend.onrender.com`). Do NOT add a trailing slash.
   - `VITE_WS_URL`: Set this to your WebSocket backend URL on Render using the `wss` protocol (e.g. `wss://prompt-db-backend.onrender.com`). Do NOT add a trailing slash.
5. **Deploy**: Click **Deploy**. Vercel will build your static assets and route all React routes correctly using the custom `vercel.json` rewrite rule provided in `frontend/vercel.json`.

---

## 3. Local Development with Separate `.env` Files

If you want to run the project locally with separate environment files:

### Backend:
1. Copy the example file:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Fill in the variables in `backend/.env`.
3. Run the backend:
   ```bash
   python backend/run.py
   ```

### Frontend:
1. Copy the example file:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
2. Adjust `VITE_API_URL` and `VITE_WS_URL` to point to your local backend (typically `http://localhost:8000` and `ws://localhost:8000`).
3. Run the frontend:
   ```bash
   cd frontend
   npm run dev
   ```
