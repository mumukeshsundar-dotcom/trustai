from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import json
import random
import hashlib
import uuid
from datetime import datetime, timedelta
import os

app = FastAPI(title="TrustAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), "../database/trustai.db")

# ─── DB INIT ────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    c.execute("""CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT, email TEXT UNIQUE, password TEXT,
        role TEXT, gst TEXT, fssai TEXT, verified INTEGER DEFAULT 0,
        created_at TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT, price REAL, quantity INTEGER,
        supplier_id TEXT, owner_id TEXT,
        category TEXT, description TEXT,
        in_marketplace INTEGER DEFAULT 0,
        created_at TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        product_id TEXT, buyer_id TEXT, seller_id TEXT,
        quantity INTEGER, total REAL, status TEXT,
        created_at TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS deliveries (
        id TEXT PRIMARY KEY,
        order_id TEXT, logistics_id TEXT, business_id TEXT,
        from_address TEXT, to_address TEXT,
        status TEXT DEFAULT 'Pending',
        tracking_log TEXT DEFAULT '[]',
        created_at TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS supply_chain (
        id TEXT PRIMARY KEY,
        product_id TEXT, event TEXT, actor_id TEXT, actor_role TEXT,
        timestamp TEXT, notes TEXT
    )""")

    c.execute("""CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        owner_id TEXT, product_id TEXT, amount REAL,
        quantity INTEGER, date TEXT
    )""")

    # Seed demo users
    users = [
        ("u1", "Arjun Sharma", "owner@demo.com", _hash("demo123"), "business_owner", "GST29ABC1234Z1", "FSSAI12345", 1),
        ("u2", "Priya Traders", "supplier@demo.com", _hash("demo123"), "supplier", "GST27XYZ9876A2", "", 1),
        ("u3", "SpeedShip Logistics", "logistics@demo.com", _hash("demo123"), "logistics", "", "", 0),
    ]
    for u in users:
        try:
            c.execute("INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?)",
                      (*u, datetime.now().isoformat()))
        except: pass

    # Seed products
    products = [
        ("p1", "Basmati Rice 25kg", 1200.0, 45, "u2", "u1", "Grains", "Premium quality basmati", 1),
        ("p2", "Refined Oil 5L", 650.0, 12, "u2", "u1", "Oils", "Sunflower refined oil", 1),
        ("p3", "Turmeric Powder 1kg", 180.0, 3, "u2", "u1", "Spices", "Pure turmeric", 1),
        ("p4", "Wheat Flour 10kg", 420.0, 78, "u2", "u1", "Grains", "Chakki fresh atta", 1),
        ("p5", "Green Tea 500g", 350.0, 8, "u2", "u2", "Beverages", "Organic green tea", 1),
    ]
    for p in products:
        try:
            c.execute("INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?)",
                      (*p, datetime.now().isoformat()))
        except: pass

    # Seed sales (last 7 days)
    for i in range(14):
        try:
            date = (datetime.now() - timedelta(days=i % 7)).strftime("%Y-%m-%d")
            c.execute("INSERT INTO sales VALUES (?,?,?,?,?,?)",
                      (str(uuid.uuid4()), "u1", "p1", random.uniform(800, 2400), random.randint(1, 5), date))
        except: pass

    # Seed supply chain
    events = [
        ("sc1", "p1", "Product Created", "u2", "supplier", "2024-01-10"),
        ("sc2", "p1", "Quality Checked", "u2", "supplier", "2024-01-11"),
        ("sc3", "p1", "Picked for Delivery", "u3", "logistics", "2024-01-12"),
        ("sc4", "p1", "In Transit", "u3", "logistics", "2024-01-13"),
        ("sc5", "p1", "Delivered to Business", "u1", "business_owner", "2024-01-14"),
    ]
    for e in events:
        try:
            c.execute("INSERT INTO supply_chain VALUES (?,?,?,?,?,?,?)",
                      (*e, "Verified"))
        except: pass

    conn.commit()
    conn.close()

def _hash(p): return hashlib.sha256(p.encode()).hexdigest()

# ─── MODELS ─────────────────────────────────────────────────────────────────

class LoginReq(BaseModel):
    email: str
    password: str

class ProductReq(BaseModel):
    name: str
    price: float
    quantity: int
    category: str = "General"
    description: str = ""
    supplier_id: str = "u2"
    owner_id: str

class OrderReq(BaseModel):
    product_id: str
    buyer_id: str
    seller_id: str
    quantity: int

class DeliveryReq(BaseModel):
    order_id: str
    business_id: str
    from_address: str
    to_address: str

class DeliveryUpdate(BaseModel):
    delivery_id: str
    status: str
    logistics_id: str

class MarketplaceToggle(BaseModel):
    product_id: str
    owner_id: str
    in_marketplace: bool

class VerifyReq(BaseModel):
    user_id: str
    gst: str = ""
    fssai: str = ""

# ─── AUTH ────────────────────────────────────────────────────────────────────

@app.post("/login")
def login(req: LoginReq):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email=? AND password=?",
                      (req.email, _hash(req.password))).fetchone()
    db.close()
    if not user:
        raise HTTPException(400, "Invalid credentials")
    return {"success": True, "user": dict(user)}

@app.get("/users/{user_id}")
def get_user(user_id: str):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    db.close()
    if not user: raise HTTPException(404, "User not found")
    return dict(user)

# ─── DASHBOARD ───────────────────────────────────────────────────────────────

@app.get("/dashboard/{user_id}")
def get_dashboard(user_id: str):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    if not user: raise HTTPException(404)

    role = user["role"]
    data = {"role": role, "user": dict(user)}

    if role == "business_owner":
        products = db.execute("SELECT * FROM products WHERE owner_id=?", (user_id,)).fetchall()
        sales = db.execute("SELECT * FROM sales WHERE owner_id=? ORDER BY date DESC LIMIT 30", (user_id,)).fetchall()
        total_revenue = sum(s["amount"] for s in sales)
        total_cost = total_revenue * 0.65
        data.update({
            "total_products": len(products),
            "total_revenue": round(total_revenue, 2),
            "total_cost": round(total_cost, 2),
            "profit": round(total_revenue - total_cost, 2),
            "low_stock": [dict(p) for p in products if p["quantity"] < 10],
            "sales_trend": _sales_trend(sales),
            "products": [dict(p) for p in products],
        })

    elif role == "supplier":
        products = db.execute("SELECT * FROM products WHERE supplier_id=?", (user_id,)).fetchall()
        orders = db.execute(
            "SELECT o.*, p.name as product_name FROM orders o JOIN products p ON o.product_id=p.id WHERE o.seller_id=?",
            (user_id,)).fetchall()
        revenue = sum(o["total"] for o in orders)
        data.update({
            "total_products": len(products),
            "total_orders": len(orders),
            "revenue": round(revenue, 2),
            "products": [dict(p) for p in products],
            "orders": [dict(o) for o in orders],
        })

    elif role == "logistics":
        deliveries = db.execute("SELECT * FROM deliveries WHERE logistics_id=? OR logistics_id=''", (user_id,)).fetchall()
        all_deliveries = db.execute("SELECT * FROM deliveries").fetchall()
        earnings = len([d for d in deliveries if d["status"] == "Delivered"]) * 150
        data.update({
            "total_deliveries": len(all_deliveries),
            "pending": len([d for d in all_deliveries if d["status"] == "Pending"]),
            "in_transit": len([d for d in all_deliveries if d["status"] == "In Transit"]),
            "delivered": len([d for d in all_deliveries if d["status"] == "Delivered"]),
            "earnings": earnings,
            "deliveries": [dict(d) for d in all_deliveries],
        })

    db.close()
    return data

def _sales_trend(sales):
    by_date = {}
    for s in sales:
        d = s["date"]
        by_date[d] = by_date.get(d, 0) + s["amount"]
    sorted_dates = sorted(by_date.keys())[-7:]
    return [{"date": d, "amount": round(by_date[d], 2)} for d in sorted_dates]

# ─── PRODUCTS ────────────────────────────────────────────────────────────────

@app.get("/products")
def get_products(owner_id: str = None):
    db = get_db()
    if owner_id:
        rows = db.execute("SELECT * FROM products WHERE owner_id=?", (owner_id,)).fetchall()
    else:
        rows = db.execute("SELECT * FROM products").fetchall()
    db.close()
    return [dict(r) for r in rows]

@app.post("/add-product")
def add_product(req: ProductReq):
    db = get_db()
    pid = str(uuid.uuid4())[:8]
    db.execute("INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?)",
               (pid, req.name, req.price, req.quantity, req.supplier_id,
                req.owner_id, req.category, req.description, 0,
                datetime.now().isoformat()))
    # Add supply chain entry
    db.execute("INSERT INTO supply_chain VALUES (?,?,?,?,?,?,?)",
               (str(uuid.uuid4()), pid, "Product Added to Inventory",
                req.owner_id, "business_owner", datetime.now().isoformat(), "New stock"))
    db.commit()
    db.close()
    return {"success": True, "product_id": pid}

@app.put("/products/{product_id}")
def update_product(product_id: str, quantity: int, owner_id: str):
    db = get_db()
    db.execute("UPDATE products SET quantity=? WHERE id=? AND owner_id=?",
               (quantity, product_id, owner_id))
    db.commit()
    db.close()
    return {"success": True}

@app.delete("/products/{product_id}")
def delete_product(product_id: str):
    db = get_db()
    db.execute("DELETE FROM products WHERE id=?", (product_id,))
    db.commit()
    db.close()
    return {"success": True}

@app.post("/marketplace-toggle")
def toggle_marketplace(req: MarketplaceToggle):
    db = get_db()
    db.execute("UPDATE products SET in_marketplace=? WHERE id=? AND owner_id=?",
               (1 if req.in_marketplace else 0, req.product_id, req.owner_id))
    db.commit()
    db.close()
    return {"success": True}

# ─── MARKETPLACE ─────────────────────────────────────────────────────────────

@app.get("/marketplace")
def marketplace(search: str = "", category: str = ""):
    db = get_db()
    query = "SELECT p.*, u.name as seller_name, u.verified as seller_verified FROM products p JOIN users u ON (p.owner_id=u.id OR p.supplier_id=u.id) WHERE p.in_marketplace=1"
    params = []
    if search:
        query += " AND (p.name LIKE ? OR p.description LIKE ?)"
        params += [f"%{search}%", f"%{search}%"]
    if category:
        query += " AND p.category=?"
        params.append(category)
    rows = db.execute(query, params).fetchall()
    db.close()
    # deduplicate
    seen = set()
    result = []
    for r in rows:
        if r["id"] not in seen:
            seen.add(r["id"])
            result.append(dict(r))
    # "Underrated" shops: randomly highlight 2
    for i in random.sample(range(len(result)), min(2, len(result))):
        result[i]["underrated_boost"] = True
    return result

# ─── ORDERS ──────────────────────────────────────────────────────────────────

@app.post("/create-order")
def create_order(req: OrderReq):
    db = get_db()
    product = db.execute("SELECT * FROM products WHERE id=?", (req.product_id,)).fetchone()
    if not product: raise HTTPException(404, "Product not found")
    oid = str(uuid.uuid4())[:8]
    total = product["price"] * req.quantity
    db.execute("INSERT INTO orders VALUES (?,?,?,?,?,?,?,?)",
               (oid, req.product_id, req.buyer_id, req.seller_id,
                req.quantity, total, "Confirmed", datetime.now().isoformat()))
    db.execute("UPDATE products SET quantity=quantity-? WHERE id=?",
               (req.quantity, req.product_id))
    # Record sale
    db.execute("INSERT INTO sales VALUES (?,?,?,?,?,?)",
               (str(uuid.uuid4()), req.buyer_id, req.product_id,
                total, req.quantity, datetime.now().strftime("%Y-%m-%d")))
    db.commit()
    db.close()
    return {"success": True, "order_id": oid, "total": total}

# ─── DELIVERIES ───────────────────────────────────────────────────────────────

@app.post("/create-delivery")
def create_delivery(req: DeliveryReq):
    db = get_db()
    did = str(uuid.uuid4())[:8]
    log = json.dumps([{"status": "Order Placed", "time": datetime.now().isoformat()}])
    db.execute("INSERT INTO deliveries VALUES (?,?,?,?,?,?,?,?,?)",
               (did, req.order_id, "", req.business_id,
                req.from_address, req.to_address, "Pending", log,
                datetime.now().isoformat()))
    db.commit()
    db.close()
    return {"success": True, "delivery_id": did}

@app.post("/update-delivery")
def update_delivery(req: DeliveryUpdate):
    db = get_db()
    delivery = db.execute("SELECT * FROM deliveries WHERE id=?", (req.delivery_id,)).fetchone()
    if not delivery: raise HTTPException(404)
    log = json.loads(delivery["tracking_log"])
    log.append({"status": req.status, "time": datetime.now().isoformat()})
    db.execute("UPDATE deliveries SET status=?, logistics_id=?, tracking_log=? WHERE id=?",
               (req.status, req.logistics_id, json.dumps(log), req.delivery_id))
    db.commit()
    db.close()
    return {"success": True}

@app.get("/deliveries/{delivery_id}")
def get_delivery(delivery_id: str):
    db = get_db()
    d = db.execute("SELECT * FROM deliveries WHERE id=?", (delivery_id,)).fetchone()
    db.close()
    if not d: raise HTTPException(404)
    result = dict(d)
    result["tracking_log"] = json.loads(result["tracking_log"])
    return result

# ─── SUPPLY CHAIN ────────────────────────────────────────────────────────────

@app.get("/supply-chain/{product_id}")
def supply_chain(product_id: str):
    db = get_db()
    events = db.execute(
        "SELECT sc.*, u.name as actor_name FROM supply_chain sc LEFT JOIN users u ON sc.actor_id=u.id WHERE sc.product_id=? ORDER BY sc.timestamp",
        (product_id,)).fetchall()
    db.close()
    return [dict(e) for e in events]

# ─── AI ──────────────────────────────────────────────────────────────────────
@app.get("/tracking/{product_id}")
def get_tracking(product_id: str):
    db = get_db()

    rows = db.execute("""
        SELECT event, actor_role, timestamp
        FROM supply_chain
        WHERE product_id=?
        ORDER BY timestamp ASC
    """, (product_id,)).fetchall()

    db.close()

    if not rows:
        raise HTTPException(status_code=404, detail="No tracking found")

    # Convert to required format
    history = []
    for r in rows:
        history.append({
            "stage": r["actor_role"].capitalize(),
            "status": r["event"],
            "time": r["timestamp"]
        })

    return {
        "product_id": product_id,
        "history": history
    }
@app.post("/analyze")
def analyze_business(user_id: str):
    db = get_db()
    products = db.execute("SELECT * FROM products WHERE owner_id=?", (user_id,)).fetchall()
    sales = db.execute("SELECT * FROM sales WHERE owner_id=? ORDER BY date DESC LIMIT 20", (user_id,)).fetchall()
    db.close()

    total_revenue = sum(s["amount"] for s in sales)
    low_stock = [p for p in products if p["quantity"] < 10]
    
    insights = []
    suggestions = []
    
    if low_stock:
        names = ", ".join(p["name"] for p in low_stock[:3])
        insights.append(f"⚠️ Critical low stock on: {names}")
        suggestions.append(f"Reorder {names} immediately to avoid stockouts")
    
    if total_revenue > 0:
        avg_daily = total_revenue / 7
        insights.append(f"📈 Average daily revenue: ₹{avg_daily:,.0f}")
        if avg_daily > 2000:
            suggestions.append("Strong sales performance! Consider expanding product range")
        else:
            suggestions.append("Boost visibility by listing products in the marketplace")
    
    insights.append("🛒 3 competitor suppliers listed similar items at lower prices")
    insights.append("📦 Supplier delivery time improved by 15% this month")
    suggestions.append("Partner with verified suppliers to reduce cost by ~12%")
    suggestions.append("Run a weekend promotion on slow-moving items")
    
    growth_tips = [
        "List on marketplace to reach 500+ potential buyers",
        "Enable supply chain tracking to build buyer trust",
        "Get GST/FSSAI verified for priority marketplace placement",
    ]
    
    return {
        "insights": insights,
        "suggestions": suggestions,
        "growth_tips": growth_tips,
        "score": random.randint(68, 87),
        "score_label": "Business Health Score",
    }

@app.post("/generate-marketing")
def generate_marketing(product_id: str, platform: str = "whatsapp"):
    db = get_db()
    product = db.execute("SELECT * FROM products WHERE id=?", (product_id,)).fetchone()
    db.close()
    if not product: raise HTTPException(404)

    p = dict(product)
    name = p["name"]
    price = p["price"]
    cat = p["category"]

    templates = {
        "whatsapp": [
            f"🌟 *Fresh Stock Alert!* 🌟\n\n✅ {name}\n💰 Only ₹{price:.0f}\n📦 Limited quantity available!\n\n👆 Order now before stock runs out!\n📞 Contact us today",
            f"🎉 *Special Offer on {name}!*\n\n📌 Category: {cat}\n💵 Price: ₹{price:.0f}\n✨ Quality Guaranteed\n\n🛒 WhatsApp us to place your order NOW!\n⏰ Hurry - Limited Stock!",
        ],
        "instagram": [
            f"✨ Elevate your {cat.lower()} game with premium {name} 🔥\n\nStarting at just ₹{price:.0f} | Quality you can trust 💯\n\n#MSME #MakeInIndia #{cat} #QualityProducts #SmallBusiness",
            f"🛍️ Now in stock: {name}\n💸 ₹{price:.0f} only\n🌿 Sourced directly from verified suppliers\n\nTag someone who needs this! 👇\n#IndianBusiness #{cat}Love #ShopLocal",
        ],
        "ad": [
            f"🏆 Best Quality {name} | ₹{price:.0f} | Verified Supplier | Fast Delivery | GST Invoice Available | Order Now!",
            f"Buy Premium {name} Online - ₹{price:.0f} | Trusted by 500+ MSMEs | Bulk Discounts Available | Free Delivery on Orders Above ₹2000",
        ]
    }

    msgs = templates.get(platform, templates["whatsapp"])
    return {
        "messages": msgs,
        "product": p,
        "platform": platform
    }

# ─── VERIFICATION ─────────────────────────────────────────────────────────────

@app.post("/verify-business")
def verify_business(req: VerifyReq):
    db = get_db()
    db.execute("UPDATE users SET gst=?, fssai=?, verified=1 WHERE id=?",
               (req.gst, req.fssai, req.user_id))
    db.commit()
    db.close()
    return {"success": True, "message": "Business verified successfully!"}

# ─── STARTUP ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    init_db()
    print("✅ TrustAI API started at http://localhost:8000")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
