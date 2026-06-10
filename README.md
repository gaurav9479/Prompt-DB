<div align="center">

# 🏪 Prompt-DB

### Real-time Business & Analytics Command Center

**Multi-tenant POS · Natural Language Interface · Live Analytics · PDF Invoicing**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql)](https://neon.tech)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)](https://python.org)

</div>

---

## 🚀 What is Prompt-DB?

Prompt-DB is a **full-stack multi-tenant business management platform** designed for retail shops. It combines a natural-language command interface, real-time inventory & order tracking, a live analytics dashboard, and PDF invoice generation — all in a single authenticated, role-gated system.

Think: *Shopify + Metabase + ChatGPT for your local shop*, running entirely on your own data.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🗣️ **Natural Language Commands** | Type "add 50 iPhone 15 at ₹65,000" — the system parses intent and executes |
| 📊 **Live Analytics Dashboard** | Revenue trends, RFM segmentation, stock health — all computed in pure SQL/pandas |
| 🏢 **Multi-tenant Architecture** | Isolated tenants via company codes, role hierarchy, and encrypted DB credentials |
| 📄 **PDF Invoice Generation** | Auto-generated invoices on every sale, downloadable by customers |
| 🔐 **Encrypted External DB** | Super admins can connect their own PostgreSQL — stored Fernet-encrypted at rest |
| 🔄 **Real-time WebSocket** | Live order updates broadcast across all connected clients |
| 🌙 **4 Theme Modes** | Black-Orange / Midnight-Teal / Charcoal-Amber / Graphite-Lime |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Browser (React 18)                     │
│  Auth → Dashboard (Super Admin / Admin / Customer)       │
│  Natural Language Bar → Analytics → Orders → Inventory   │
└───────────────┬─────────────────────────────────────────┘
                │ REST + WebSocket
┌───────────────▼─────────────────────────────────────────┐
│                 FastAPI (Python 3.11)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Auth Routes │  │ Shop Routes  │  │Analytics Routes│  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                │                   │           │
│  ┌──────▼──────────────────────────────────▼──────────┐ │
│  │         Controllers + Services (Business Logic)     │ │
│  │   IntentParser · ActionExecutor · AnalyticsService  │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                          │                               │
│  ┌───────────────────────▼──────────────────────────┐   │
│  │     SQLAlchemy Async + Neon PostgreSQL            │   │
│  │  users · shops · products · orders · branches     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 👥 Role System

```
super_admin  (Shop Owner)
    │  - Registers shop with GST, bank details
    │  - Generates SHOP-XXXX company code for employees
    │  - Full analytics, settings, platform view
    │
    └── admin  (Employee)
            │  - Registers using company code
            │  - Assigned to a Branch on profile completion
            │  - Manages inventory, orders for their shop
            │
            └── customer
                   - Registered or guest
                   - Browses shops, places orders, downloads invoices
```

---

## 🔐 Security Design

- **Fernet Encryption** — external DB connection strings encrypted at rest (AES-128-CBC + HMAC-SHA256)
- **Response Screening Middleware** — every outbound API response is scanned; any payload containing `postgresql://` is blocked before transmission
- **Custom JWT** — HMAC-SHA256 tokens, no third-party JWT library dependency
- **Server-Side Auth Hydration** — on every page load, the app calls `/api/auth/me` to get fresh user state from DB (prevents stale cache attacks)
- **Company Code Isolation** — employees are bound to employers by opaque codes, never by internal IDs

---

## 🧠 Analytics Engine

All analytics run **purely on SQL aggregations** — no external APIs, no paid services:

| Report | Method |
|--------|--------|
| Revenue trend (30 days) | `DATE_TRUNC` + `SUM` grouped by day |
| Top 5 products by volume | `GROUP BY product_name ORDER BY SUM(qty)` |
| Stock health (< 7 days left) | `current_stock / avg_daily_sales` ratio |
| RFM Segmentation | Recency, Frequency, Monetary scoring in pandas |
| Customer LTV | Cumulative `SUM(total_amount)` per customer over time |
| Admin Sales Activity | Per-admin order volume with week-over-week delta |

Analytics can optionally route queries to the user's own external PostgreSQL database via temporary engine creation + immediate disposal.

---

## 📂 Project Structure

```
Prompt-DB/
├── backend/
│   ├── api/
│   │   ├── controllers/     # Business logic (auth, shop, product, order, analytics...)
│   │   └── routes/          # FastAPI router definitions
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic v2 request/response schemas
│   ├── services/            # Service layer (UserService, AnalyticsService, IntentParser...)
│   ├── security/            # JWT (HMAC-SHA256) + Fernet encryption
│   ├── core/                # Database engine, config, WebSocket manager
│   ├── seed_data.py         # 350+ realistic demo orders seeder
│   └── run.py               # Uvicorn entry point
│
└── frontend/
    ├── src/
    │   ├── pages/           # Auth, SuperAdminDashboard, AdminDashboard, CustomerView
    │   ├── components/      # Analytics, ThemeSelector, VoiceButton...
    │   ├── hooks/           # useVoiceRecognition
    │   ├── utils/           # helpers (password strength etc.)
    │   ├── context/         # ThemeContext
    │   └── config.js        # API URL configuration
    └── vite.config.js
```

---

## 🛠️ Setup & Run

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Neon PostgreSQL database (or any PostgreSQL)

### Backend

```bash
# 1. Clone and enter
git clone <repo-url> && cd Prompt-DB

# 2. Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r backend/requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# 5. Run migrations / seed data
python backend/migrate_db.py
python backend/seed_data.py  # optional: loads 350+ demo orders

# 6. Start server
python backend/run.py
# → http://localhost:8000
# → API docs: http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
GEMINI_API_KEY=your_key_here          # optional: for AI command parsing
GROQ_API_KEY=your_key_here            # optional: voice transcription
FERNET_SECRET_KEY=your_fernet_key    # generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## 🎭 Demo Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| **Super Admin** | `superadmin@promptdb.com` | `qwert12345` | TechHub Electronics · Company Code: `SHOP-DEMO` |
| **Admin** | `admin@promptdb.com` | `qwert12345` | Rahul Verma · Brigade Road Branch |
| **Customer** | `customer@promptdb.com` | `qwert12345` | Browse & order from any shop |

---

## 📡 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login with email + password |
| `/api/auth/me` | GET | Get fresh user profile (JWT required) |
| `/api/auth/register/owner` | POST | Register shop owner with GST details |
| `/api/auth/register/employee` | POST | Register employee with company code |
| `/api/profile/owner/complete` | POST | Complete owner onboarding (banking, PAN) |
| `/api/profile/employee/complete` | POST | Complete employee onboarding + branch creation |
| `/api/analytics/live` | GET | Live dashboard metrics (auto-updates every 5 min) |
| `/api/analytics/rfm` | GET | RFM customer segmentation |
| `/api/analytics/customer-ltv` | GET | Customer lifetime value analysis |
| `/api/command` | POST | Natural language command execution |
| `/api/orders/{id}/invoice` | GET | PDF invoice download |
| `/api/ws` | WS | Real-time order broadcast WebSocket |

Full interactive docs: `http://localhost:8000/docs`

---

## 🧩 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 18 + Vite | Fast HMR, code splitting |
| **Styling** | Vanilla CSS with CSS custom properties | Full theme control, no framework lock-in |
| **Routing** | React Router v6 | Declarative role-gated routes |
| **Backend** | FastAPI | Async-native, auto OpenAPI docs, Pydantic v2 |
| **ORM** | SQLAlchemy 2.0 (async) | Type-safe queries, connection pooling |
| **Database** | Neon PostgreSQL | Serverless, branching, connection pooling built-in |
| **Auth** | Custom HMAC-SHA256 JWT | Zero external dependencies |
| **Encryption** | Python `cryptography` (Fernet) | Industry-standard AES + HMAC |
| **Analytics** | pandas + numpy on raw SQL | No BI tool required |
| **Realtime** | FastAPI WebSocket | No additional broker needed |

---

<div align="center">

Built with ❤️ for the modern shopkeeper

</div>
