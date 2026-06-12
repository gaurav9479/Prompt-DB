# Prompt-DB: Product Features & Implementation Guide

## Overview
Prompt-DB is a full-stack e-commerce and shop management platform with advanced features like real-time commands, analytics, multi-theme support, and role-based access control. Built with FastAPI backend, React frontend, and PostgreSQL database.

---

## 🎨 Features & How They're Achieved

### 1. **Multi-Theme System (4 Color Palettes)**

#### Features:
- Switch between 4 pre-designed color themes
- Persistent theme selection (saved to localStorage)
- Consistent theme application across all pages
- Theme selector in header navigation

#### How It's Achieved:

**Frontend Architecture:**
- **ThemeContext** (`frontend/src/context/ThemeContext.jsx`):
  - Manages global theme state using React Context API
  - Persists selection to `localStorage` with key `'promptdb_color_theme'`
  - Provides `useTheme()` hook for component access
  
- **ThemeSelector Component** (`frontend/src/components/ThemeSelector.jsx`):
  - Dropdown UI with 4 theme options
  - Visual color preview boxes showing primary/accent colors
  - Checkmark indicator for active theme
  
- **CSS System** (`frontend/src/index.css` lines 1-135):
  - Uses CSS custom properties (variables) with `[data-color-theme]` attribute selectors
  - Each theme defines 35+ CSS variables (colors, gradients, shadows)
  - Single source of truth for color values

**Theme Palettes:**

| Theme | Background | Text | Accent |
|-------|-----------|------|--------|
| **Black + Orange** | #161616 | #e8e8e8 | #ff5500 |
| **Midnight + Teal** | #071029 | #e8e8e8 | #26c6da |
| **Charcoal + Amber** | #0b0b0d | #e8e8e8 | #ffb86b |
| **Graphite + Lime** | #121214 | #e8e8e8 | #b9ff66 |

**Implementation Flow:**
```
User clicks theme → ThemeSelector updates context 
→ Context saves to localStorage 
→ App wrapper sets data-color-theme attribute on root
→ CSS applies correct variable values
→ All components re-render with new theme colors
```

---

### 2. **FastAPI Backend REST API**

#### Features:
- 13+ specialized REST endpoints organized by domain
- Error handling and validation via Pydantic schemas
- Async database queries with SQLAlchemy 2.0
- CORS support for frontend communication

#### How It's Achieved:

**Architecture** (`backend/api/`):
- **Controllers** - Business logic for each domain:
  - `auth_controller.py` - Login, registration, token management
  - `product_controller.py` - Product CRUD operations
  - `order_controller.py` - Order processing
  - `shop_controller.py` - Shop management
  - `analytics_controller.py` - Analytics data
  - `user_controller.py` - User management
  - `ws_controller.py` - WebSocket handling
  
- **Routes** - URL mapping:
  - `auth_routes.py` → `/api/auth/*`
  - `product_routes.py` → `/api/products/*`
  - `order_routes.py` → `/api/orders/*`
  - All routes registered in `backend/main.py`

**Request/Response Validation:**
```python
# Pydantic schemas in backend/schemas/
@dataclass
class CreateProductSchema:
    name: str
    price: float
    shop_id: int
    # Automatic validation & error messages
```

**Async Database Queries:**
```python
# In controllers, using SQLAlchemy async
async with db.get_db() as session:
    result = await session.execute(query)
    return result.scalars().all()
```

**Entry Point** (`backend/run.py`):
- Ensures project root is in `sys.path`
- Runs uvicorn server on port 8000
- Auto-reloads on file changes

---

### 3. **PostgreSQL Database with Async ORM**

#### Features:
- 8 core tables with relationships
- Async SQLAlchemy 2.0 integration
- Automatic schema creation on startup
- Connection pooling via Neon

#### How It's Achieved:

**Database Setup** (`backend/core/database.py`):
- **URL Configuration:**
  - Strips unsupported asyncpg parameters (sslmode, channel_binding)
  - Sets SSL via `connect_args={"ssl": True}`
  - Handles Neon cloud PostgreSQL specifics
  
- **Async Engine:**
  ```python
  engine = create_async_engine(
      DATABASE_URL,
      echo=False,
      pool_pre_ping=True,  # Verify connections
      connect_args={"ssl": True}
  )
  ```

**Models** (`backend/models/`):
- **User** - Authentication, roles (super_admin, admin, customer)
- **Product** - Items with pricing, inventory
- **Shop** - Seller information and settings
- **Order** - Customer purchases with status tracking
- **Customer** - Customer profiles and preferences
- **ActionLog** - Audit trail of all operations

**Initialization** (`backend/main.py`):
```python
@app.on_event("startup")
async def startup():
    # Create tables if not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Insert default users
    await create_default_users()
```

---

### 4. **React Frontend with Modern UI**

#### Features:
- Role-based dashboard views
- Responsive dark theme interface
- Real-time data updates
- Smooth animations and transitions

#### How It's Achieved:

**Navigation & Routing** (`frontend/src/App.jsx`):
- React Router for client-side routing
- Protected routes based on user role
- Role mapping: `/super-admin`, `/admin`, `/shop`, `/`

**Page Components:**

| Page | Route | Role | Purpose |
|------|-------|------|---------|
| **Auth.jsx** | `/auth` | Public | Login/registration |
| **SuperAdminDashboard.jsx** | `/super-admin` | Super Admin | Platform stats, user management |
| **AdminDashboard.jsx** | `/admin` | Admin/Shop Owner | Shop products, orders, analytics |
| **CustomerView.jsx** | `/`, `/category`, `/shop` | Customer | Marketplace browsing |

**State Management:**
- **ThemeContext** - Global theme state
- **React Hooks** - Local component state (useState, useEffect)
- No Redux/external state library needed for current scope

**Styling Approach:**
- Global CSS in `frontend/src/index.css` (~3200 lines)
- Component-scoped styles within same file
- CSS custom properties for theming
- Flexbox for layouts

---

### 5. **Role-Based Access Control (RBAC)**

#### Features:
- 3 user roles: super_admin, admin, customer
- Different dashboard views per role
- Restricted API endpoints

#### How It's Achieved:

**User Model** (`backend/models/user.py`):
```python
class User(Base):
    role: str  # Values: 'super_admin', 'admin', 'customer'
    email: str
    password_hash: str
```

**Authentication Flow** (`backend/api/controllers/auth_controller.py`):
1. User logs in with email/password
2. Backend validates credentials
3. Returns JWT token with role embedded
4. Frontend stores token in localStorage
5. Subsequent requests include token
6. Backend verifies role for endpoint access

**Frontend Route Protection** (`frontend/src/App.jsx`):
```javascript
<Route path="/super-admin" element={<SuperAdminDashboard />} />
// Frontend relies on backend 401 responses for wrong roles
```

**Default Users Created on Startup:**
- Super Admin: email@example.com / password (platform owner)
- Admin: admin@example.com / password (shop owner)
- Customer: customer@example.com / password (buyer)

---

### 6. **WebSocket Real-Time Communication**

#### Features:
- Real-time updates for connected clients
- Broadcast messages to multiple users
- WebSocket endpoint for live data

#### How It's Achieved:

**Backend** (`backend/core/websocket.py`):
```python
# FastAPI WebSocket support
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    # Handle real-time messages
    # Broadcast to other clients
```

**Controller** (`backend/api/controllers/ws_controller.py`):
- Manages WebSocket connections
- Routes messages to appropriate handlers
- Broadcasts updates to subscribed clients

**Use Cases:**
- Live order notifications
- Real-time shop updates
- Chat/messaging system
- Analytics streaming

---

### 7. **Analytics & Reporting**

#### Features:
- Track user actions (views, purchases, searches)
- Generate business metrics
- Time-series analytics data
- Dashboard visualizations

#### How It's Achieved:

**Action Logging** (`backend/models/action_log.py`):
```python
class ActionLog(Base):
    user_id: int
    action_type: str  # 'view', 'purchase', 'search', etc.
    entity_type: str  # 'product', 'shop', etc.
    timestamp: datetime
```

**Service** (`backend/services/analytics_service.py`):
- Aggregates logs into metrics
- Calculates trends over time
- Generates reports by shop/user

**Controller** (`backend/api/controllers/analytics_controller.py`):
- Endpoints for dashboard data
- Filter by date range, user, shop
- Returns JSON for frontend charts

**Frontend Display** (`frontend/src/pages/SuperAdminDashboard.jsx`):
- Renders stat cards with key metrics
- Charts for trend visualization
- Drill-down capability for details

---

### 8. **Product & Shop Management**

#### Features:
- Create, read, update, delete products
- Organize products by categories
- Shop-specific product lists
- Inventory tracking
- Dynamic pricing

#### How It's Achieved:

**Models:**
- **Product** (`backend/models/product.py`):
  ```python
  name: str
  price: float
  shop_id: ForeignKey
  category_id: ForeignKey
  inventory_count: int
  ```

- **Shop** (`backend/models/shop.py`):
  ```python
  name: str
  owner_id: ForeignKey
  description: str
  is_active: bool
  ```

- **ShopCategory** (`backend/models/shop.py`):
  - Categorize products (Electronics, Food, etc.)

**Services** (`backend/services/`):
- `product_service.py` - Product business logic
- `shop_service.py` - Shop operations
- Validation, calculations, side effects

**Endpoints:**
```
GET    /api/products          - List all products
GET    /api/products/{id}     - Get product details
POST   /api/products          - Create product (admin only)
PUT    /api/products/{id}     - Update product
DELETE /api/products/{id}     - Delete product
GET    /api/shops             - List all shops
```

**Frontend Display:**
- Product cards with images, price, rating
- Shop pages with filtered products
- Category navigation
- Search and filtering

---

### 9. **Order Management System**

#### Features:
- Create and track customer orders
- Multiple order statuses (pending, confirmed, shipped, delivered, cancelled)
- Order history per user
- Revenue tracking per shop

#### How It's Achieved:

**Order Model** (`backend/models/order.py`):
```python
customer_id: ForeignKey
shop_id: ForeignKey
total_price: float
status: str  # 'pending', 'confirmed', 'shipped', etc.
items: relationship to OrderItems
created_at: datetime
```

**Order Service** (`backend/services/order_service.py`):
- Validates order before creation
- Checks inventory availability
- Calculates taxes/shipping
- Updates customer purchase history
- Tracks metrics for analytics

**Order Status Flow:**
```
pending → confirmed → shipped → delivered → completed
                ↓
            cancelled (anytime)
```

**API Endpoints:**
```
POST   /api/orders           - Create new order
GET    /api/orders           - List user orders
GET    /api/orders/{id}      - Get order details
PUT    /api/orders/{id}      - Update order status
DELETE /api/orders/{id}      - Cancel order
```

**Frontend Order Management:**
- Order history list in dashboard
- Status tracking with timestamps
- Cancel order button (if pending/confirmed)
- Order details with itemized breakdown

---

### 10. **Command System & Intent Parsing**

#### Features:
- Natural language command processing
- Suggest commands based on user input
- Execute predefined commands
- Command history

#### How It's Achieved:

**Intent Parser** (`backend/services/intent_parser.py`):
- Analyzes user text input
- Identifies intent (create, view, update, etc.)
- Extracts parameters
- Returns structured command object

**Command Suggestions** (`backend/services/command_suggestions.py`):
- ML-based or heuristic suggestions
- Learns from user behavior
- Suggests likely next actions

**Command Executor** (`backend/services/action_executor.py`):
- Executes parsed commands
- Validates permissions
- Returns results
- Logs action

**Frontend Integration:**
```javascript
// User types natural language
input: "show me products under $50"
→ Sent to backend
→ Intent parsed (view_products, filter by price)
→ Results returned and displayed
```

---

### 11. **Dark Theme Consistency**

#### Features:
- All UI elements styled for dark background
- Proper contrast ratios for readability
- Subtle shadows and depth
- Accent colors for interactive elements

#### How It's Achieved:

**CSS Design System** (`frontend/src/index.css`):

**Color Variables** (per theme):
- `--bg-primary` - Main background
- `--bg-secondary` - Secondary backgrounds
- `--bg-tertiary` - Tertiary surfaces
- `--bg-elevated` - Floating elements (modals, dropdowns)
- `--text-primary` - Main text (light grey)
- `--text-muted` - Secondary text
- `--accent-primary` - Interactive elements (orange/teal/etc.)
- `--border-primary` - Container borders

**Component Styling:**
- `.stat-card` - Statistics display
- `.product-card` - Product listing
- `.shop-card` - Shop listings
- `.command-panel` - Command input area
- `.form-group` - Form inputs
- `.table-data` - Data tables
- All use CSS variables for consistent theming

**Contrast Calculation:**
- Light text (#e8e8e8) on dark background (#161616)
- WCAG AA compliant contrast ratio (~13:1)
- Orange accent (#ff5500) stands out clearly

**Responsive Design:**
```css
@media (max-width: 1024px) {
  /* Tablet layouts */
}
@media (max-width: 768px) {
  /* Mobile layouts */
}
```

---

### 12. **Authentication & Security**

#### Features:
- Secure password hashing
- JWT token-based authentication
- Session management
- Protected API endpoints

#### How It's Achieved:

**Password Security** (`backend/services/user_service.py`):
- Passwords hashed using bcrypt or similar
- Never stored in plaintext
- Salt generated per user

**JWT Tokens:**
- Generated on login
- Contains user_id and role
- Expires after set duration
- Required in Authorization header for protected routes

**Protected Routes:**
```python
@router.get("/protected-endpoint")
async def protected(current_user = Depends(get_current_user)):
    # Only accessible with valid JWT
    return {"data": "..."}
```

**Frontend Token Management** (`frontend/src/config.js`):
```javascript
// Store token in localStorage after login
localStorage.setItem('authToken', token)

// Include in API requests
headers: {
    'Authorization': `Bearer ${token}`
}

// Clear on logout
localStorage.removeItem('authToken')
```

---

### 13. **Real-Time Notifications**

#### Features:
- Order status updates
- Shop notifications
- User alerts
- Live feedback

#### How It's Achieved:

**WebSocket Integration:**
- Backend broadcasts events to subscribed clients
- Frontend listens for connection messages
- Updates UI reactively

**Event Types:**
- ORDER_CREATED
- ORDER_SHIPPED
- PRODUCT_OUT_OF_STOCK
- NEW_REVIEW
- SHOP_MESSAGE

**Flow:**
```
Backend event → WebSocket broadcast 
→ Frontend receives → Updates state 
→ Components re-render → Toast/notification shown
```

---

## 🏗️ Technical Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18+, Vite, React Router | UI and routing |
| **Backend** | FastAPI, Uvicorn | REST API server |
| **Database** | PostgreSQL, SQLAlchemy 2.0 | Data persistence |
| **Real-time** | WebSocket | Live updates |
| **Styling** | CSS custom properties | Theming system |
| **State** | React Context | Global state (theme) |
| **Authentication** | JWT, bcrypt | Security |

---

## 🚀 How to Use Each Feature

### Switch Themes:
1. Open any dashboard
2. Click 🎨 icon in header
3. Select from 4 themes
4. Theme applies instantly and saves

### Create a Product:
1. Login as Admin/Shop Owner
2. Go to AdminDashboard
3. Click "Add Product"
4. Fill form (name, price, category)
5. Submit → Added to database

### Place an Order:
1. Login as Customer
2. Browse marketplace (CustomerView)
3. Click product → View details
4. Click "Add to Cart" → Checkout
5. Confirm → Order created with status "pending"

### View Analytics:
1. Login as Super Admin
2. Go to SuperAdminDashboard
3. View stat cards (total revenue, orders, users)
4. Charts show trends over time

### Use Commands:
1. In dashboard, locate command panel
2. Type natural language (e.g., "show products under $50")
3. System suggests matching commands
4. Click suggestion or press Enter
5. Results displayed instantly

---

## 📝 Database Schema

```
Users
├── Shops (1 admin owns many)
│   ├── Products
│   │   └── ShopCategories
│   └── Orders
│       ├── OrderItems
│       └── Customers
├── ActionLogs
└── Commands
```

---

## 🔧 Configuration Files

- **`.env`** - Database URL, API keys, secrets
- **`backend/core/config.py`** - Backend configuration
- **`frontend/src/config.js`** - Frontend API endpoints
- **`frontend/vite.config.js`** - Build configuration
- **`package.json`** - Frontend dependencies
- **`backend/requirements.txt`** - Python dependencies

---

## ✅ Quality Assurance

- All 4 themes tested for contrast and readability
- Database connects reliably with SSL
- API endpoints validated with Pydantic schemas
- Frontend responsive across device sizes
- Error handling on all async operations
- Graceful degradation when services unavailable

---

## 📚 For Developers

To extend this platform:

1. **Add New Endpoint**: Create controller in `backend/api/controllers/`, add routes, register in `main.py`
2. **Add New Theme**: Add variables in `frontend/src/index.css` under new `[data-color-theme="name"]` block
3. **Add New Feature**: Follow existing patterns (Model → Schema → Service → Controller → Routes)
4. **Database Migrations**: Modify model, auto-sync happens on startup

---

**Last Updated**: June 2, 2026
**Version**: 1.0
