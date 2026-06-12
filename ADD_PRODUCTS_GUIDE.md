# How to Add Products via API

## Field Mapping Guide

Your request used these fields - here's how they map to the API:

### Required Fields
| Your Field | API Field | Type | Notes |
|-----------|----------|------|-------|
| Name | `name` | string | Product name (required) |
| Selling Price | `price` | float | The main product price (required) |

### Optional Pricing Fields
| Your Field | API Field | Type | Notes |
|-----------|----------|------|-------|
| Cost Price | `cost_price` | float | Used to calculate profit_margin (%) |
| Minimum Price | `min_price` | float | Lowest acceptable price |
| Compare At Price | `compare_at_price` | float | Original/list price for comparison |

### Inventory Fields
| Your Field | API Field | Type | Notes |
|-----------|----------|------|-------|
| Quantity | `quantity` | integer | Current stock level |
| Minimum Stock Level | `min_stock_level` | integer | Alert when below this |
| Maximum Stock Level | `max_stock_level` | integer | Maximum stock capacity |

### Product Details
| Your Field | API Field | Type | Notes |
|-----------|----------|------|-------|
| Description | `description` | string | Product description |
| Brand | `brand` | string | Brand name |
| SKU | `sku` | string | Unique SKU (must be unique across products) |
| Barcode | `barcode` | string | Product barcode |
| Unit | `unit` | string | Measurement unit (e.g., "litre", "piece") |
| Weight | `weight` | float | Product weight in kg |

### Category & Tags
| Your Field | API Field | Type | Notes |
|-----------|----------|------|-------|
| Category | `category_name` | string | Category name (auto-creates if doesn't exist) |
| Tags | `tags` | string | Comma-separated tags |

### Status & Features
| Your Field | API Field | Type | Notes |
|-----------|----------|------|-------|
| Active | `is_active` | boolean | Product visibility (default: true) |
| Featured | `is_featured` | boolean | Featured in store (default: false) |

### Perishable Items
| Your Field | API Field | Type | Notes |
|-----------|----------|------|-------|
| Perishable | `is_perishable` | boolean | Mark as perishable |
| Expiry Date | `expiry_date` | datetime | Expiry date (ISO format: "2026-06-20T00:00:00") |
| Expiry Alert Days | `expiry_alert_days` | integer | Days before expiry to alert |
| Clearance Discount | `clearance_discount` | float | Discount % at clearance |

### System Fields (Auto-calculated)
| Field | Calculated From | Notes |
|-------|-----------------|-------|
| `profit_margin` | (price - cost_price) / cost_price * 100 | Percentage profit margin |
| `stock_status` | quantity vs min/max levels | "in_stock", "low_stock", "out_of_stock" |
| `is_on_clearance` | expiry_date approaching | Auto-set when near expiry |

---

## Example: Adding Amul Gold Milk

### Step 1: Prepare Your Data

```json
{
  "name": "Amul Gold Milk 1L",
  "description": "Premium full cream milk suitable for tea, coffee, and daily consumption.",
  "brand": "Amul",
  "sku": "AML-GLD-1L-001",
  "barcode": "8901262000011",
  "cost_price": 58,
  "price": 65,
  "min_price": 60,
  "compare_at_price": 70,
  "quantity": 120,
  "min_stock_level": 20,
  "max_stock_level": 500,
  "category_name": "Dairy Products",
  "tags": "milk,dairy,fresh,amul",
  "unit": "litre",
  "weight": 1.0,
  "is_featured": true,
  "is_active": true,
  "is_perishable": true,
  "expiry_date": "2026-06-20T00:00:00",
  "expiry_alert_days": 7,
  "clearance_discount": 15
}
```

### Step 2: Send POST Request

**Endpoint:** `POST http://localhost:8000/api/products`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {your-jwt-token}  # If auth required
```

**Body:** Use the JSON from Step 1

### Step 3: Expected Response

**Status:** 201 Created

```json
{
  "id": 1,
  "name": "Amul Gold Milk 1L",
  "description": "Premium full cream milk suitable for tea, coffee, and daily consumption.",
  "brand": "Amul",
  "sku": "AML-GLD-1L-001",
  "barcode": "8901262000011",
  "cost_price": 58.0,
  "price": 65.0,
  "min_price": 60.0,
  "compare_at_price": 70.0,
  "quantity": 120,
  "min_stock_level": 20,
  "max_stock_level": 500,
  "category_id": 1,
  "tags": "milk,dairy,fresh,amul",
  "unit": "litre",
  "weight": 1.0,
  "is_active": true,
  "is_featured": true,
  "is_perishable": true,
  "expiry_date": "2026-06-20T00:00:00",
  "expiry_alert_days": 7,
  "clearance_discount": 15.0,
  "is_on_clearance": false,
  "created_at": "2026-06-02T10:30:00",
  "updated_at": null,
  
  // Calculated Fields (NEW!)
  "category": {
    "id": 1,
    "name": "Dairy Products",
    "description": null,
    "is_active": true,
    "created_at": "2026-06-02T10:30:00"
  },
  "profit_margin": 12.07,  // (65-58)/58 * 100
  "stock_status": "in_stock"  // Because 120 > 20 (min_stock_level)
}
```

---

## Common Issues & Fixes

### Issue 1: "SKU already exists"
**Problem:** You tried adding a product with a SKU that already exists.
**Solution:** Change the SKU to a unique value.

```json
{
  "sku": "AML-GLD-1L-002"  // Changed from 001 to 002
}
```

### Issue 2: "Category not found"
**Old behavior:** You had to create category first.
**New behavior:** The system auto-creates it!

```json
{
  "category_name": "Dairy Products"  // No need to create beforehand
}
```

### Issue 3: "Expiry date format invalid"
**Problem:** Date in wrong format.
**Solution:** Use ISO 8601 format:

```json
{
  "expiry_date": "2026-06-20T00:00:00"  // ✓ Correct
  // NOT "20-06-2026" or "2026-06-20" (without time)
}
```

### Issue 4: Missing calculated fields
**Old behavior:** Response didn't include profit_margin or stock_status.
**New behavior:** They're included in response!

```json
{
  "profit_margin": 12.07,      // Now in response
  "stock_status": "in_stock"   // Now in response
}
```

---

## cURL Example

```bash
curl -X POST http://localhost:8000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Amul Gold Milk 1L",
    "description": "Premium full cream milk suitable for tea, coffee, and daily consumption.",
    "brand": "Amul",
    "sku": "AML-GLD-1L-001",
    "barcode": "8901262000011",
    "cost_price": 58,
    "price": 65,
    "min_price": 60,
    "compare_at_price": 70,
    "quantity": 120,
    "min_stock_level": 20,
    "max_stock_level": 500,
    "category_name": "Dairy Products",
    "tags": "milk,dairy,fresh,amul",
    "unit": "litre",
    "weight": 1.0,
    "is_featured": true,
    "is_active": true,
    "is_perishable": true,
    "expiry_date": "2026-06-20T00:00:00",
    "expiry_alert_days": 7,
    "clearance_discount": 15
  }'
```

---

## Python Example

```python
import requests
from datetime import datetime

API_URL = "http://localhost:8000/api/products"

product_data = {
    "name": "Amul Gold Milk 1L",
    "description": "Premium full cream milk suitable for tea, coffee, and daily consumption.",
    "brand": "Amul",
    "sku": "AML-GLD-1L-001",
    "barcode": "8901262000011",
    "cost_price": 58,
    "price": 65,
    "min_price": 60,
    "compare_at_price": 70,
    "quantity": 120,
    "min_stock_level": 20,
    "max_stock_level": 500,
    "category_name": "Dairy Products",
    "tags": "milk,dairy,fresh,amul",
    "unit": "litre",
    "weight": 1.0,
    "is_featured": True,
    "is_active": True,
    "is_perishable": True,
    "expiry_date": datetime(2026, 6, 20).isoformat(),
    "expiry_alert_days": 7,
    "clearance_discount": 15
}

response = requests.post(API_URL, json=product_data)
print(response.status_code)
print(response.json())
```

---

## JavaScript/Fetch Example

```javascript
const productData = {
  name: "Amul Gold Milk 1L",
  description: "Premium full cream milk suitable for tea, coffee, and daily consumption.",
  brand: "Amul",
  sku: "AML-GLD-1L-001",
  barcode: "8901262000011",
  cost_price: 58,
  price: 65,
  min_price: 60,
  compare_at_price: 70,
  quantity: 120,
  min_stock_level: 20,
  max_stock_level: 500,
  category_name: "Dairy Products",
  tags: "milk,dairy,fresh,amul",
  unit: "litre",
  weight: 1.0,
  is_featured: true,
  is_active: true,
  is_perishable: true,
  expiry_date: "2026-06-20T00:00:00",
  expiry_alert_days: 7,
  clearance_discount: 15
};

fetch("http://localhost:8000/api/products", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(productData)
})
  .then(res => res.json())
  .then(data => {
    console.log("Product created:");
    console.log("ID:", data.id);
    console.log("Name:", data.name);
    console.log("Profit Margin:", data.profit_margin, "%");
    console.log("Stock Status:", data.stock_status);
  })
  .catch(err => console.error("Error:", err));
```

---

## What Was Enhanced

✅ **Auto-create categories** - No need to create category first
✅ **Return calculated fields** - profit_margin & stock_status now in response
✅ **Better response model** - ProductWithCategory includes all details
✅ **Graceful category handling** - System matches by name (case-insensitive)
✅ **Documented fields** - Clear mapping of your fields to API fields

---

**Try adding the Amul product now with the corrected data structure!**
