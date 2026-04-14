# 🤝 TrustAI — MSME Business Ecosystem

A full-stack SaaS platform for Indian MSMEs with AI insights, marketplace, supply chain transparency, and logistics management.

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
python main.py
```

API runs at: **http://localhost:8000**
API Docs: http://localhost:8000/docs

### 2. Frontend Setup

Open `frontend/index.html` in your browser, OR serve with a simple HTTP server:

```bash
cd frontend
python -m http.server 3000
```

Then open: **http://localhost:3000**

---

## 👥 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| 🏢 Business Owner | owner@demo.com | demo123 |
| 🏭 Supplier | supplier@demo.com | demo123 |
| 🚚 Logistics Partner | logistics@demo.com | demo123 |

---

## 🎯 Demo Flow

1. **Login** as Business Owner (`owner@demo.com`)
2. **Dashboard** — view sales stats, profit, low stock alerts
3. **Inventory** — add/edit products, toggle marketplace listing
4. **AI Insights** — click "Analyze My Business" for smart recommendations
5. **Marketplace** — browse & buy products, create delivery requests
6. **Supply Chain** — trace product journey from supplier to shelf
7. **Marketing** — generate WhatsApp/Instagram promotional content
8. **Verification** — submit GST/FSSAI for verified badge

---

## 📁 Project Structure

```
trustai/
├── backend/
│   ├── main.py              # FastAPI app (all routes)
│   └── requirements.txt
├── frontend/
│   ├── index.html           # Single-page app shell
│   ├── css/
│   │   └── main.css         # Full design system
│   └── js/
│       └── app.js           # All page logic
└── database/
    └── trustai.db           # SQLite (auto-created on first run)
```

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | Authenticate user |
| GET | `/dashboard/{user_id}` | Role-specific dashboard data |
| GET | `/products` | List products (filter by owner) |
| POST | `/add-product` | Add new product |
| PUT | `/products/{id}` | Update stock quantity |
| DELETE | `/products/{id}` | Delete product |
| POST | `/marketplace-toggle` | List/unlist from marketplace |
| GET | `/marketplace` | Public marketplace with search |
| POST | `/create-order` | Place an order |
| POST | `/create-delivery` | Create delivery request |
| POST | `/update-delivery` | Update delivery status |
| GET | `/deliveries/{id}` | Get delivery + tracking log |
| GET | `/supply-chain/{product_id}` | Full product chain trace |
| POST | `/analyze` | AI business analysis |
| GET | `/generate-marketing` | AI marketing content |
| POST | `/verify-business` | Submit GST/FSSAI verification |

---

## 🧩 Features

- **Multi-role system** — Business Owner, Supplier, Logistics
- **AI Analysis** — Business health score, insights, suggestions
- **Simulated Blockchain** — Immutable supply chain event log
- **Marketplace** — Search, filter, featured "underrated" shops
- **Logistics tracking** — Full delivery lifecycle with log
- **Marketing automation** — WhatsApp, Instagram, Ad copy generation
- **Trust & Verification** — GST/FSSAI badge system

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Python, FastAPI
- **Database**: SQLite
- **Fonts**: Syne + DM Sans (Google Fonts)
