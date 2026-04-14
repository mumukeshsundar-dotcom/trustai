// ── CONFIG ────────────────────────────────────────────────────────────────────
const API = 'http://localhost:8000';

// ── STATE ─────────────────────────────────────────────────────────────────────
let currentUser = null;
let currentPage = 'dashboard';

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('trustai_user');
  if (saved) {
    currentUser = JSON.parse(saved);
    initApp();
  } else {
    showAuthScreen();
  }
});

// ── AUTH ──────────────────────────────────────────────────────────────────────
function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function fillDemo(email, password) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = password;
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');

  btn.innerHTML = '<span class="spinner"></span> Logging in...';
  btn.disabled = true;

  try {
    const res = await post('/login', { email, password });
    currentUser = res.user;
    localStorage.setItem('trustai_user', JSON.stringify(currentUser));
    initApp();
  } catch (err) {
    showToast('Invalid credentials. Try demo accounts above.', 'error');
  } finally {
    btn.innerHTML = 'Sign In →';
    btn.disabled = false;
  }
}

function logout() {
  localStorage.removeItem('trustai_user');
  currentUser = null;
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

// ── APP INIT ──────────────────────────────────────────────────────────────────
function initApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  buildSidebar();
  navigateTo('dashboard');
}

function buildSidebar() {
  const role = currentUser.role;

  document.getElementById('sidebar-user-name').textContent = currentUser.name;
  document.getElementById('sidebar-user-role').textContent = role.replace('_', ' ');
  document.getElementById('sidebar-avatar').textContent = currentUser.name.charAt(0);

  const roleBadgeEl = document.getElementById('topbar-role-badge');
  const roleMap = {
    business_owner: ['badge-owner', '🏢 Business Owner'],
    supplier: ['badge-supplier', '🏭 Supplier'],
    logistics: ['badge-logistics', '🚚 Logistics'],
  };
  const [cls, label] = roleMap[role] || ['badge-info', role];
  roleBadgeEl.className = `badge ${cls}`;
  roleBadgeEl.textContent = label;

  const navEl = document.getElementById('sidebar-nav');

  const allNavItems = {
    business_owner: [
      { icon: '📊', label: 'Dashboard', page: 'dashboard' },
      { icon: '📦', label: 'Inventory', page: 'inventory' },
      { icon: '🤖', label: 'AI Insights', page: 'ai' },
      { icon: '🛍️', label: 'Marketplace', page: 'marketplace' },
      { icon: '🔗', label: 'Supply Chain', page: 'supply-chain' },
      { icon: '🚚', label: 'Logistics', page: 'logistics' },
      { icon: '📢', label: 'Marketing', page: 'marketing' },
      { icon: '🔐', label: 'Verification', page: 'verify' },
    ],
    supplier: [
      { icon: '📊', label: 'Dashboard', page: 'dashboard' },
      { icon: '📦', label: 'My Products', page: 'inventory' },
      { icon: '🛍️', label: 'Marketplace', page: 'marketplace' },
      { icon: '🔗', label: 'Supply Chain', page: 'supply-chain' },
      { icon: '📢', label: 'Marketing', page: 'marketing' },
      { icon: '🔐', label: 'Verification', page: 'verify' },
    ],
    logistics: [
      { icon: '📊', label: 'Dashboard', page: 'dashboard' },
      { icon: '🚚', label: 'Deliveries', page: 'logistics' },
    ],
  };

  const items = allNavItems[role] || allNavItems.business_owner;
  navEl.innerHTML = `<div class="nav-section-label">Main Menu</div>` +
    items.map(item => `
      <div class="nav-item" data-page="${item.page}" onclick="navigateTo('${item.page}')">
        <span class="icon">${item.icon}</span>
        ${item.label}
      </div>
    `).join('');
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard: '📊 Dashboard',
  inventory: '📦 Inventory',
  ai: '🤖 AI Insights',
  marketplace: '🛍️ Marketplace',
  'supply-chain': '🔗 Supply Chain',
  logistics: '🚚 Logistics',
  marketing: '📢 Marketing',
  verify: '🔐 Verification',
};

function navigateTo(page) {
  currentPage = page;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  document.getElementById('topbar-title').textContent = PAGE_TITLES[page] || page;

  const container = document.getElementById('page-container');
  container.innerHTML = `<div class="loading-overlay"><span class="spinner"></span> Loading...</div>`;

  const loaders = {
    dashboard: loadDashboard,
    inventory: loadInventory,
    ai: loadAI,
    marketplace: loadMarketplace,
    'supply-chain': loadSupplyChain,
    logistics: loadLogistics,
    marketing: loadMarketing,
    verify: loadVerify,
  };

  (loaders[page] || (() => { container.innerHTML = '<p>Page not found</p>'; }))();
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  const data = await get(`/dashboard/${currentUser.id}`);
  const container = document.getElementById('page-container');
  const role = currentUser.role;

  if (role === 'business_owner') renderOwnerDashboard(container, data);
  else if (role === 'supplier') renderSupplierDashboard(container, data);
  else if (role === 'logistics') renderLogisticsDashboard(container, data);
}

function renderOwnerDashboard(el, d) {
  const profitColor = d.profit >= 0 ? 'var(--success)' : 'var(--warn)';
  const lowStockAlert = d.low_stock?.length
    ? `<div class="alert alert-warn mb-20">⚠️ <strong>${d.low_stock.length} item(s)</strong> are low on stock: ${d.low_stock.map(p => p.name).join(', ')}</div>`
    : '';

  el.innerHTML = `
    ${lowStockAlert}
    <div class="stat-grid">
      <div class="stat-card">
        <div class="accent-bar" style="background:linear-gradient(90deg,var(--accent),var(--accent2))"></div>
        <span class="stat-icon">💰</span>
        <div class="stat-value">₹${fmt(d.total_revenue)}</div>
        <div class="stat-label">Total Revenue</div>
        <div class="stat-delta delta-up">↑ 12.4% this week</div>
      </div>
      <div class="stat-card">
        <div class="accent-bar" style="background:linear-gradient(90deg,var(--success),#00a878)"></div>
        <span class="stat-icon">📈</span>
        <div class="stat-value" style="color:${profitColor}">₹${fmt(d.profit)}</div>
        <div class="stat-label">Net Profit</div>
        <div class="stat-delta ${d.profit >= 0 ? 'delta-up' : 'delta-down'}">${d.profit >= 0 ? '↑' : '↓'} Profit margin: ${Math.round(d.profit/d.total_revenue*100||0)}%</div>
      </div>
      <div class="stat-card">
        <div class="accent-bar" style="background:linear-gradient(90deg,var(--accent2),#a97aff)"></div>
        <span class="stat-icon">📦</span>
        <div class="stat-value">${d.total_products}</div>
        <div class="stat-label">Products in Stock</div>
        <div class="stat-delta delta-down">${d.low_stock?.length || 0} low stock items</div>
      </div>
      <div class="stat-card">
        <div class="accent-bar" style="background:linear-gradient(90deg,var(--accent3),#00a888)"></div>
        <span class="stat-icon">🏭</span>
        <div class="stat-value">3</div>
        <div class="stat-label">Active Suppliers</div>
        <div class="stat-delta delta-up">↑ 1 new this month</div>
      </div>
    </div>

    <div class="grid-2 mb-20">
      <div class="card">
        <div class="card-header">
          <h3>📈 Sales Trend (7 days)</h3>
        </div>
        ${renderMiniChart(d.sales_trend)}
      </div>
      <div class="ai-panel">
        <div class="ai-header">
          <div class="ai-icon">🤖</div>
          <div>
            <h3>AI Quick Insights</h3>
            <p>Auto-generated for your business</p>
          </div>
        </div>
        <ul class="ai-insight-list" id="quick-insights">
          <li>Loading insights...</li>
        </ul>
        <button class="btn btn-primary" onclick="navigateTo('ai')">Full Analysis →</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>📦 Inventory Overview</h3>
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('inventory')">Manage All</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Qty</th><th>Status</th></tr></thead>
          <tbody>
            ${(d.products || []).slice(0, 5).map(p => `
              <tr>
                <td><strong>${p.name}</strong></td>
                <td><span class="badge badge-info">${p.category}</span></td>
                <td>₹${p.price}</td>
                <td class="${p.quantity < 10 ? 'text-danger' : ''}">${p.quantity}</td>
                <td>${p.quantity < 10
                  ? '<span class="status status-pending">Low Stock</span>'
                  : '<span class="status status-delivered">In Stock</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Load quick insights async
  get(`/analyze?user_id=${currentUser.id}`).then(ai => {
    const el = document.getElementById('quick-insights');
    if (el) el.innerHTML = ai.insights.slice(0, 3).map(i => `<li>${i}</li>`).join('');
  }).catch(() => {});
}

function renderSupplierDashboard(el, d) {
  el.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="accent-bar" style="background:linear-gradient(90deg,var(--accent2),#a97aff)"></div>
        <span class="stat-icon">📦</span>
        <div class="stat-value">${d.total_products}</div>
        <div class="stat-label">Products Listed</div>
      </div>
      <div class="stat-card">
        <div class="accent-bar" style="background:linear-gradient(90deg,var(--accent),var(--accent2))"></div>
        <span class="stat-icon">🛒</span>
        <div class="stat-value">${d.total_orders}</div>
        <div class="stat-label">Orders Received</div>
      </div>
      <div class="stat-card">
        <div class="accent-bar" style="background:linear-gradient(90deg,var(--success),#00a878)"></div>
        <span class="stat-icon">💰</span>
        <div class="stat-value">₹${fmt(d.revenue)}</div>
        <div class="stat-label">Total Revenue</div>
      </div>
      <div class="stat-card">
        <div class="accent-bar" style="background:linear-gradient(90deg,var(--accent3),#00a888)"></div>
        <span class="stat-icon">🏢</span>
        <div class="stat-value">5</div>
        <div class="stat-label">Connected Businesses</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>📋 Recent Orders</h3></div>
      ${d.orders?.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Qty</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              ${d.orders.slice(0, 10).map(o => `
                <tr>
                  <td><strong>${o.product_name}</strong></td>
                  <td>${o.quantity}</td>
                  <td>₹${fmt(o.total)}</td>
                  <td><span class="status status-delivered">Confirmed</span></td>
                  <td class="text-muted text-sm">${o.created_at?.split('T')[0]}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty-state"><div class="e-icon">📭</div><p>No orders yet</p></div>`}
    </div>
  `;
}

function renderLogisticsDashboard(el, d) {
  el.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="accent-bar" style="background:linear-gradient(90deg,var(--accent),var(--accent2))"></div>
        <span class="stat-icon">📋</span>
        <div class="stat-value">${d.total_deliveries}</div>
        <div class="stat-label">Total Deliveries</div>
      </div>
      <div class="stat-card">
        <div class="accent-bar" style="background:linear-gradient(90deg,var(--warn),#ff9a60)"></div>
        <span class="stat-icon">⏳</span>
        <div class="stat-value">${d.pending}</div>
        <div class="stat-label">Pending</div>
      </div>
      <div class="stat-card">
        <div class="accent-bar" style="background:linear-gradient(90deg,#3b82f6,#6366f1)"></div>
        <span class="stat-icon">🚛</span>
        <div class="stat-value">${d.in_transit}</div>
        <div class="stat-label">In Transit</div>
      </div>
      <div class="stat-card">
        <div class="accent-bar" style="background:linear-gradient(90deg,var(--success),#00a878)"></div>
        <span class="stat-icon">✅</span>
        <div class="stat-value">₹${fmt(d.earnings)}</div>
        <div class="stat-label">Earnings</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <h3>🚚 Delivery Requests</h3>
        <button class="btn btn-secondary btn-sm" onclick="navigateTo('logistics')">Manage All</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>From</th><th>To</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${(d.deliveries || []).slice(0, 5).map(del => `
              <tr>
                <td><code style="font-size:11px;color:var(--accent)">#${del.id}</code></td>
                <td class="text-sm">${del.from_address || '–'}</td>
                <td class="text-sm">${del.to_address || '–'}</td>
                <td>${statusBadge(del.status)}</td>
                <td>
                  ${del.status === 'Pending' ? `<button class="btn btn-sm btn-accent" onclick="acceptDelivery('${del.id}')">Accept</button>` : ''}
                  ${del.status === 'In Transit' ? `<button class="btn btn-sm btn-success" onclick="markDelivered('${del.id}')">Mark Delivered</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderMiniChart(trend) {
  if (!trend?.length) return '<p class="text-muted text-sm">No data</p>';
  const max = Math.max(...trend.map(t => t.amount), 1);
  return `
    <div class="mini-chart">
      ${trend.map(t => {
        const h = Math.max(Math.round((t.amount / max) * 80), 4);
        const date = t.date?.slice(5) || '';
        return `<div class="chart-bar-wrap">
          <div class="chart-bar" style="height:${h}px"></div>
          <div class="chart-label">${date}</div>
        </div>`;
      }).join('')}
    </div>
  `;
}

// ── INVENTORY ─────────────────────────────────────────────────────────────────
async function loadInventory() {
  const products = await get(`/products?owner_id=${currentUser.id}`);
  const container = document.getElementById('page-container');

  container.innerHTML = `
    <div class="flex-between mb-20">
      <div>
        <h2 style="font-family:'Syne';font-size:20px;font-weight:700">Product Inventory</h2>
        <p class="text-muted text-sm">${products.length} products total</p>
      </div>
      <button class="btn btn-primary" onclick="showAddProductModal()">+ Add Product</button>
    </div>

    ${products.filter(p => p.quantity < 10).length ? `
      <div class="alert alert-warn mb-20">
        ⚠️ ${products.filter(p => p.quantity < 10).length} item(s) need restocking
      </div>
    ` : ''}

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th><th>Category</th><th>Price</th>
              <th>Qty</th><th>Stock Status</th><th>Marketplace</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="inventory-tbody">
            ${renderInventoryRows(products)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderInventoryRows(products) {
  if (!products.length) return `<tr><td colspan="7"><div class="empty-state"><div class="e-icon">📦</div><p>No products yet. Add your first product!</p></div></td></tr>`;
  return products.map(p => `
    <tr>
      <td>
        <div style="font-weight:600">${p.name}</div>
        <div class="text-muted text-sm">${p.description || ''}</div>
      </td>
      <td><span class="badge badge-info">${p.category}</span></td>
      <td>₹${p.price}</td>
      <td class="${p.quantity < 10 ? 'text-danger' : ''}" style="font-weight:${p.quantity < 10 ? '700' : '400'}">${p.quantity}</td>
      <td>${p.quantity < 10
        ? '<span class="status status-pending">Low Stock</span>'
        : '<span class="status status-delivered">In Stock</span>'}</td>
      <td>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" ${p.in_marketplace ? 'checked' : ''}
            onchange="toggleMarketplace('${p.id}',this.checked)"
            style="width:16px;height:16px;margin:0">
          <span class="text-sm" style="color:var(--text2)">Listed</span>
        </label>
      </td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-xs" onclick="showUpdateModal('${p.id}','${p.name}',${p.quantity})">Edit Qty</button>
          <button class="btn btn-ghost btn-xs" onclick="showSupplyChain('${p.id}')">🔗 Chain</button>
          <button class="btn btn-danger btn-xs" onclick="deleteProduct('${p.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function showAddProductModal() {
  showModal('add-product-modal', `
    <div class="modal-header">
      <h3>+ Add New Product</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <form onsubmit="submitAddProduct(event)">
      <label>Product Name</label>
      <input type="text" id="ap-name" placeholder="e.g. Basmati Rice 25kg" required>
      <div class="grid-2">
        <div>
          <label>Price (₹)</label>
          <input type="number" id="ap-price" placeholder="1200" min="0" required>
        </div>
        <div>
          <label>Quantity</label>
          <input type="number" id="ap-qty" placeholder="50" min="0" required>
        </div>
      </div>
      <label>Category</label>
      <select id="ap-cat">
        <option>Grains</option><option>Oils</option><option>Spices</option>
        <option>Beverages</option><option>Dairy</option><option>General</option>
      </select>
      <label>Description</label>
      <textarea id="ap-desc" placeholder="Short product description..."></textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" style="width:auto">Add Product</button>
      </div>
    </form>
  `);
}

async function submitAddProduct(e) {
  e.preventDefault();
  const payload = {
    name: val('ap-name'),
    price: parseFloat(val('ap-price')),
    quantity: parseInt(val('ap-qty')),
    category: val('ap-cat'),
    description: val('ap-desc'),
    owner_id: currentUser.id,
    supplier_id: 'u2',
  };
  await post('/add-product', payload);
  closeModal();
  showToast('✅ Product added successfully!', 'success');
  loadInventory();
}

function showUpdateModal(id, name, qty) {
  showModal('update-modal', `
    <div class="modal-header">
      <h3>Update Stock: ${name}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <label>New Quantity</label>
    <input type="number" id="new-qty" value="${qty}" min="0">
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" style="width:auto" onclick="submitUpdateQty('${id}')">Update</button>
    </div>
  `);
}

async function submitUpdateQty(id) {
  const qty = parseInt(val('new-qty'));
  await fetch(`${API}/products/${id}?quantity=${qty}&owner_id=${currentUser.id}`, { method: 'PUT' });
  closeModal();
  showToast('✅ Stock updated', 'success');
  loadInventory();
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  await fetch(`${API}/products/${id}`, { method: 'DELETE' });
  showToast('🗑️ Product deleted', 'success');
  loadInventory();
}

async function toggleMarketplace(id, listed) {
  await post('/marketplace-toggle', { product_id: id, owner_id: currentUser.id, in_marketplace: listed });
  showToast(listed ? '🛍️ Listed in marketplace' : 'Removed from marketplace', 'success');
}

// ── AI INSIGHTS ──────────────────────────────────────────────────────────────
async function loadAI() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="flex-between mb-20">
      <div>
        <h2 style="font-family:'Syne';font-size:20px;font-weight:700">🤖 AI Business Intelligence</h2>
        <p class="text-muted text-sm">Powered by TrustAI analytics engine</p>
      </div>
      <button class="btn btn-primary" onclick="runAnalysis()">🔍 Analyze My Business</button>
    </div>
    <div id="ai-results">
      <div class="ai-panel">
        <div class="ai-header">
          <div class="ai-icon">🤖</div>
          <div>
            <h3>Ready to Analyze</h3>
            <p>Click "Analyze My Business" to get personalized insights</p>
          </div>
        </div>
        <div class="empty-state">
          <div class="e-icon">🧠</div>
          <p>Your AI insights will appear here</p>
        </div>
      </div>
    </div>

    <div style="margin-top:24px">
      <div class="section-title">✍️ AI Marketing Generator</div>
      <div class="card">
        <h3 style="margin-bottom:16px;font-size:15px">Generate Promotional Content</h3>
        <div class="grid-2">
          <div>
            <label>Select Product</label>
            <select id="mkt-product-select">
              <option value="">Loading products...</option>
            </select>
          </div>
          <div>
            <label>Platform</label>
            <select id="mkt-platform">
              <option value="whatsapp">📱 WhatsApp</option>
              <option value="instagram">📸 Instagram</option>
              <option value="ad">📰 Ad Copy</option>
            </select>
          </div>
        </div>
        <button class="btn btn-accent" onclick="generateMarketing()">✨ Generate Content</button>
        <div id="mkt-results" style="margin-top:16px"></div>
      </div>
    </div>
  `;

  // Load products for marketing select
  const products = await get(`/products?owner_id=${currentUser.id}`);
  const sel = document.getElementById('mkt-product-select');
  if (sel) {
    sel.innerHTML = products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }
}

async function runAnalysis() {
  const btn = document.querySelector('[onclick="runAnalysis()"]');
  if (btn) { btn.innerHTML = '<span class="spinner"></span> Analyzing...'; btn.disabled = true; }

  const data = await get(`/analyze?user_id=${currentUser.id}`);

  if (btn) { btn.innerHTML = '🔍 Analyze My Business'; btn.disabled = false; }

  const el = document.getElementById('ai-results');
  if (!el) return;

  el.innerHTML = `
    <div class="ai-panel">
      <div class="ai-header">
        <div class="ai-icon">🤖</div>
        <div>
          <h3>Business Analysis Complete</h3>
          <p>Based on your sales, inventory and market data</p>
        </div>
        <div style="text-align:center;margin-left:auto">
          <div class="score-ring">
            <span class="score-num">${data.score}</span>
            <span class="score-max">/100</span>
          </div>
          <div class="text-sm text-muted">${data.score_label}</div>
        </div>
      </div>

      <div class="section-title">📊 Key Insights</div>
      <ul class="ai-insight-list">
        ${data.insights.map(i => `<li>${i}</li>`).join('')}
      </ul>

      <div class="section-title">💡 Suggestions</div>
      <ul class="ai-suggestion-list">
        ${data.suggestions.map(s => `<li>→ ${s}</li>`).join('')}
      </ul>

      <div class="section-title" style="margin-top:16px">🚀 Growth Tips</div>
      <ul class="ai-suggestion-list">
        ${data.growth_tips.map(t => `<li>🎯 ${t}</li>`).join('')}
      </ul>
    </div>
  `;
}

async function generateMarketing() {
  const productId = val('mkt-product-select');
  const platform = val('mkt-platform');
  if (!productId) { showToast('Please select a product', 'error'); return; }

  const data = await get(`/generate-marketing?product_id=${productId}&platform=${platform}`);
  const el = document.getElementById('mkt-results');
  if (!el) return;

  el.innerHTML = `
    <div class="section-title">Generated Messages</div>
    ${data.messages.map((msg, i) => `
      <div class="msg-card">
        <button class="copy-btn" onclick="copyText(this, \`${msg.replace(/`/g, '\\`')}\`)">Copy</button>
        ${escHtml(msg)}
      </div>
    `).join('')}
  `;
}

// ── MARKETPLACE ───────────────────────────────────────────────────────────────
async function loadMarketplace() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="flex-between mb-20">
      <div>
        <h2 style="font-family:'Syne';font-size:20px;font-weight:700">🛍️ Marketplace</h2>
        <p class="text-muted text-sm">Discover verified suppliers & products</p>
      </div>
    </div>
    <div class="search-bar">
      <input class="search-input" id="market-search" placeholder="Search products, suppliers..." oninput="filterMarket()">
      <select id="market-cat" onchange="filterMarket()" style="margin:0;width:180px">
        <option value="">All Categories</option>
        <option>Grains</option><option>Oils</option><option>Spices</option>
        <option>Beverages</option><option>Dairy</option><option>General</option>
      </select>
    </div>
    <div id="market-grid" class="product-grid">
      <div class="loading-overlay"><span class="spinner"></span> Loading marketplace...</div>
    </div>
  `;
  await fetchAndRenderMarket();
}

let _allMarketProducts = [];

async function fetchAndRenderMarket(search = '', category = '') {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);

  const products = await get(`/marketplace?${params}`);
  _allMarketProducts = products;
  renderMarketGrid(products);
}

function filterMarket() {
  const search = val('market-search');
  const cat = val('market-cat');
  fetchAndRenderMarket(search, cat);
}

function renderMarketGrid(products) {
  const el = document.getElementById('market-grid');
  if (!el) return;
  if (!products.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="e-icon">🛒</div><p>No products found</p></div>`;
    return;
  }
  el.innerHTML = products.map(p => `
    <div class="product-card">
      ${p.underrated_boost ? '<div class="p-boost">🔥 Featured</div>' : ''}
      <div class="p-category">${p.category || 'General'}</div>
      <div class="p-name">${p.name}</div>
      <div class="p-seller">
        by ${p.seller_name || 'Unknown'}
        ${p.seller_verified ? ' <span class="badge badge-verified">✓ Verified</span>' : ''}
      </div>
      <div class="p-price">₹${p.price}</div>
      <div class="p-stock ${p.quantity < 10 ? 'stock-low' : ''}">${p.quantity} units available</div>
      <div class="p-actions">
        <button class="btn btn-primary btn-sm" style="flex:1" onclick="buyProduct('${p.id}','${p.owner_id || p.supplier_id}')">Buy Now</button>
        <button class="btn btn-ghost btn-sm" onclick="showSupplyChain('${p.id}')">🔗</button>
      </div>
    </div>
  `).join('');
}

async function buyProduct(productId, sellerId) {
  const qty = parseInt(prompt('Enter quantity to order:') || '0');
  if (!qty || qty < 1) return;

  try {
    const res = await post('/create-order', {
      product_id: productId,
      buyer_id: currentUser.id,
      seller_id: sellerId,
      quantity: qty,
    });
    showToast(`✅ Order placed! Total: ₹${fmt(res.total)}`, 'success');

    // Prompt to create delivery
    if (confirm('Create delivery request for this order?')) {
      const fromAddr = prompt('Pickup address:', 'Supplier Warehouse, Mumbai');
      const toAddr = prompt('Delivery address:', currentUser.name + ', Business Location');
      if (fromAddr && toAddr) {
        await post('/create-delivery', {
          order_id: res.order_id,
          business_id: currentUser.id,
          from_address: fromAddr,
          to_address: toAddr,
        });
        showToast('🚚 Delivery request created!', 'success');
      }
    }
  } catch (e) {
    showToast('Failed to place order', 'error');
  }
}

// ── SUPPLY CHAIN ──────────────────────────────────────────────────────────────
async function loadSupplyChain() {
  const products = await get(`/products?owner_id=${currentUser.id}`);
  const container = document.getElementById('page-container');

  container.innerHTML = `
    <div class="mb-20">
      <h2 style="font-family:'Syne';font-size:20px;font-weight:700">🔗 Supply Chain Transparency</h2>
      <p class="text-muted text-sm">Track every product from supplier to your shelf</p>
    </div>

    <div class="alert alert-info mb-20">
      🔐 All events are cryptographically logged and immutable — ensuring complete transparency
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Select Product to Track</h3></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${products.map(p => `
            <button class="btn btn-secondary" style="justify-content:flex-start;text-align:left"
              onclick="loadChainFor('${p.id}','${escAttr(p.name)}')">
              📦 ${p.name}
            </button>
          `).join('')}
          <button class="btn btn-secondary" onclick="loadChainFor('p1','Basmati Rice 25kg')">
            📦 Basmati Rice 25kg (Demo)
          </button>
        </div>
      </div>
      <div id="chain-panel">
        <div class="empty-state">
          <div class="e-icon">🔗</div>
          <p>Select a product to view its chain</p>
        </div>
      </div>
    </div>
  `;
}

async function loadChainFor(productId, productName) {
  const panel = document.getElementById('chain-panel');
  panel.innerHTML = `<div class="loading-overlay"><span class="spinner"></span></div>`;

  const events = await get(`/supply-chain/${productId}`);

  const roleIcons = { supplier: '🏭', logistics: '🚚', business_owner: '🏢' };

  panel.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>📦 ${productName}</h3></div>
      <div class="timeline">
        ${events.length ? events.map((e, i) => `
          <div class="timeline-item">
            <div class="timeline-dot done"></div>
            <div class="t-event">${roleIcons[e.actor_role] || '•'} ${e.event}</div>
            <div class="t-actor">By: ${e.actor_name || e.actor_id} · ${e.actor_role?.replace('_',' ')}</div>
            <div class="t-time">${e.timestamp}</div>
          </div>
        `).join('') : `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="t-event">No events recorded yet</div>
          </div>
        `}
      </div>
      <div style="margin-top:16px;padding:12px;background:var(--bg3);border-radius:8px">
        <div class="text-sm text-muted">🔐 Verification Hash</div>
        <code style="font-size:10px;color:var(--accent);word-break:break-all">
          ${hashStr(productId + events.length)}
        </code>
      </div>
    </div>
  `;
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(8, '0') + 'a3f2b1c9d84e7f6a' + Math.abs(h ^ 0xdeadbeef).toString(16);
}

// ── LOGISTICS ────────────────────────────────────────────────────────────────
async function loadLogistics() {
  const data = await get(`/dashboard/${currentUser.id}`);
  const container = document.getElementById('page-container');

  const deliveries = data.deliveries || [];

  container.innerHTML = `
    <div class="flex-between mb-20">
      <div>
        <h2 style="font-family:'Syne';font-size:20px;font-weight:700">🚚 Logistics Management</h2>
        <p class="text-muted text-sm">${deliveries.length} total delivery requests</p>
      </div>
      ${currentUser.role === 'business_owner' ? `<button class="btn btn-primary" onclick="showCreateDeliveryModal()">+ New Delivery Request</button>` : ''}
    </div>

    <div class="tabs">
      <button class="tab active" onclick="filterDeliveries('all', this)">All (${deliveries.length})</button>
      <button class="tab" onclick="filterDeliveries('Pending', this)">Pending (${deliveries.filter(d=>d.status==='Pending').length})</button>
      <button class="tab" onclick="filterDeliveries('In Transit', this)">In Transit (${deliveries.filter(d=>d.status==='In Transit').length})</button>
      <button class="tab" onclick="filterDeliveries('Delivered', this)">Delivered (${deliveries.filter(d=>d.status==='Delivered').length})</button>
    </div>

    <div class="card">
      <div class="table-wrap" id="delivery-table">
        ${renderDeliveryTable(deliveries)}
      </div>
    </div>
  `;

  window._allDeliveries = deliveries;
}

function filterDeliveries(status, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const filtered = status === 'all' ? window._allDeliveries : window._allDeliveries.filter(d => d.status === status);
  document.getElementById('delivery-table').innerHTML = renderDeliveryTable(filtered);
}

function renderDeliveryTable(deliveries) {
  if (!deliveries.length) return `<div class="empty-state"><div class="e-icon">🚚</div><p>No deliveries in this category</p></div>`;
  return `
    <table>
      <thead><tr><th>ID</th><th>From</th><th>To</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>
        ${deliveries.map(d => `
          <tr>
            <td><code style="font-size:11px;color:var(--accent)">#${d.id}</code></td>
            <td class="text-sm">${d.from_address || '–'}</td>
            <td class="text-sm">${d.to_address || '–'}</td>
            <td>${statusBadge(d.status)}</td>
            <td class="text-muted text-sm">${d.created_at?.split('T')[0] || '–'}</td>
            <td>
              <div style="display:flex;gap:6px">
                <button class="btn btn-ghost btn-xs" onclick="showTrackingModal('${d.id}')">Track</button>
                ${currentUser.role === 'logistics' && d.status === 'Pending'
                  ? `<button class="btn btn-accent btn-xs" onclick="acceptDelivery('${d.id}')">Accept</button>`
                  : ''}
                ${currentUser.role === 'logistics' && d.status === 'In Transit'
                  ? `<button class="btn btn-success btn-xs" onclick="markDelivered('${d.id}')">Delivered</button>`
                  : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function showCreateDeliveryModal() {
  showModal('create-del', `
    <div class="modal-header">
      <h3>🚚 New Delivery Request</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <form onsubmit="submitDelivery(event)">
      <label>Order ID (leave blank for test)</label>
      <input type="text" id="del-order" placeholder="e.g. ord001" value="ord001">
      <label>Pickup Address</label>
      <input type="text" id="del-from" placeholder="Supplier Warehouse, Mumbai" required>
      <label>Delivery Address</label>
      <input type="text" id="del-to" placeholder="Your business address" required>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" style="width:auto">Create Request</button>
      </div>
    </form>
  `);
}

async function submitDelivery(e) {
  e.preventDefault();
  await post('/create-delivery', {
    order_id: val('del-order') || 'manual',
    business_id: currentUser.id,
    from_address: val('del-from'),
    to_address: val('del-to'),
  });
  closeModal();
  showToast('🚚 Delivery request created!', 'success');
  loadLogistics();
}

async function acceptDelivery(id) {
  await post('/update-delivery', { delivery_id: id, status: 'In Transit', logistics_id: currentUser.id });
  showToast('✅ Delivery accepted — In Transit', 'success');
  loadLogistics();
}

async function markDelivered(id) {
  await post('/update-delivery', { delivery_id: id, status: 'Delivered', logistics_id: currentUser.id });
  showToast('✅ Marked as Delivered!', 'success');
  loadLogistics();
}

async function showTrackingModal(id) {
  const d = await get(`/deliveries/${id}`);
  const log = d.tracking_log || [];
  showModal('track-modal', `
    <div class="modal-header">
      <h3>📍 Tracking #${id}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="mb-12"><strong>From:</strong> ${d.from_address}</div>
    <div class="mb-12"><strong>To:</strong> ${d.to_address}</div>
    <div class="mb-12">Status: ${statusBadge(d.status)}</div>
    <div class="section-title">Tracking Log</div>
    <div class="timeline">
      ${log.map(l => `
        <div class="timeline-item">
          <div class="timeline-dot done"></div>
          <div class="t-event">${l.status}</div>
          <div class="t-time">${new Date(l.time).toLocaleString()}</div>
        </div>
      `).join('')}
    </div>
  `);
}

// ── MARKETING ────────────────────────────────────────────────────────────────
async function loadMarketing() {
  const products = await get(`/products?owner_id=${currentUser.id}`);
  const container = document.getElementById('page-container');

  container.innerHTML = `
    <div class="mb-20">
      <h2 style="font-family:'Syne';font-size:20px;font-weight:700">📢 Marketing Automation</h2>
      <p class="text-muted text-sm">Generate AI-powered promotional content for your products</p>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3 style="margin-bottom:16px;font-size:15px">📱 Campaign Creator</h3>
        <label>Select Product</label>
        <select id="m-product">
          ${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
        </select>
        <label>Platform</label>
        <select id="m-platform">
          <option value="whatsapp">📱 WhatsApp</option>
          <option value="instagram">📸 Instagram</option>
          <option value="ad">📰 Ad Copy</option>
        </select>
        <button class="btn btn-primary" onclick="runMarketing()">✨ Generate Promotion</button>

        <div style="margin-top:20px">
          <div class="section-title">💡 Quick Ideas</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${['Weekend Sale Campaign', 'New Stock Alert', 'Bulk Discount Offer', 'Festival Special'].map(idea => `
              <button class="btn btn-ghost btn-sm" style="justify-content:flex-start" onclick="showToast('Tip: Use for ${idea}','success')">
                💡 ${idea}
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <div id="mkt-output">
        <div class="empty-state" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div class="e-icon">✍️</div>
          <p>Generated content will appear here</p>
        </div>
      </div>
    </div>
  `;
}

async function runMarketing() {
  const productId = val('m-product');
  const platform = val('m-platform');

  const data = await get(`/generate-marketing?product_id=${productId}&platform=${platform}`);
  const el = document.getElementById('mkt-output');
  if (!el) return;

  const platformNames = { whatsapp: '📱 WhatsApp', instagram: '📸 Instagram', ad: '📰 Ad Copy' };

  el.innerHTML = `
    <div class="card-header"><h3>${platformNames[platform] || platform} Content</h3></div>
    <p class="text-muted text-sm mb-12">For: ${data.product?.name}</p>
    ${data.messages.map((msg, i) => `
      <div class="msg-card">
        <button class="copy-btn" onclick="copyText(this, \`${msg.replace(/`/g,'\\`').replace(/"/g,'&quot;')}\`)">Copy</button>
        <strong style="font-size:11px;color:var(--text3)">Version ${i+1}</strong><br><br>
        ${escHtml(msg)}
      </div>
    `).join('')}
  `;
}

// ── VERIFY ───────────────────────────────────────────────────────────────────
async function loadVerify() {
  const user = await get(`/users/${currentUser.id}`);
  const container = document.getElementById('page-container');

  container.innerHTML = `
    <div class="mb-20">
      <h2 style="font-family:'Syne';font-size:20px;font-weight:700">🔐 Business Verification</h2>
      <p class="text-muted text-sm">Get verified to build trust and get marketplace priority</p>
    </div>

    ${user.verified ? `
      <div class="alert alert-success mb-20">
        ✅ Your business is verified! You get priority listing in the marketplace.
      </div>
    ` : `
      <div class="alert alert-warn mb-20">
        ⚠️ Your business is not verified. Get verified to unlock priority marketplace placement.
      </div>
    `}

    <div class="grid-2">
      <div class="verify-section">
        <h3 style="margin-bottom:16px;font-size:15px">📋 Verification Details</h3>
        <form onsubmit="submitVerification(event)">
          <label>GST Number</label>
          <input type="text" id="v-gst" value="${user.gst || ''}" placeholder="e.g. 29ABCDE1234F1Z5">
          <label>FSSAI License Number (if applicable)</label>
          <input type="text" id="v-fssai" value="${user.fssai || ''}" placeholder="e.g. 12345678901234">
          <button type="submit" class="btn btn-primary">Submit for Verification</button>
        </form>
      </div>

      <div class="card">
        <h3 style="margin-bottom:16px;font-size:15px">🎯 Benefits of Verification</h3>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${[
            ['✅', 'Verified badge on all listings', 'Builds buyer trust instantly'],
            ['🔝', 'Priority marketplace placement', 'Appear at the top of search results'],
            ['🛡️', 'Fraud protection', 'Protected buyer transactions'],
            ['📈', '3x more visibility', 'Verified shops get more inquiries'],
          ].map(([icon, title, desc]) => `
            <div style="display:flex;gap:12px;padding:12px;background:var(--bg3);border-radius:8px">
              <span style="font-size:20px">${icon}</span>
              <div>
                <div style="font-weight:600;font-size:13px">${title}</div>
                <div class="text-muted text-sm">${desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

async function submitVerification(e) {
  e.preventDefault();
  await post('/verify-business', {
    user_id: currentUser.id,
    gst: val('v-gst'),
    fssai: val('v-fssai'),
  });
  currentUser.verified = 1;
  localStorage.setItem('trustai_user', JSON.stringify(currentUser));
  showToast('✅ Business verified successfully!', 'success');
  loadVerify();
}

// ── SUPPLY CHAIN SHORTCUT ─────────────────────────────────────────────────────
async function showSupplyChain(productId) {
  const events = await get(`/supply-chain/${productId}`);
  const roleIcons = { supplier: '🏭', logistics: '🚚', business_owner: '🏢' };

  showModal('sc-modal', `
    <div class="modal-header">
      <h3>🔗 Supply Chain Trace</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="timeline">
      ${events.length ? events.map(e => `
        <div class="timeline-item">
          <div class="timeline-dot done"></div>
          <div class="t-event">${roleIcons[e.actor_role] || '•'} ${e.event}</div>
          <div class="t-actor">${e.actor_name || e.actor_id}</div>
          <div class="t-time">${e.timestamp}</div>
        </div>
      `).join('') : '<p class="text-muted">No chain events found</p>'}
    </div>
  `);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
async function get(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function post(path, body) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function val(id) { return document.getElementById(id)?.value || ''; }

function fmt(n) {
  if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return Math.round(n || 0).toString();
}

function statusBadge(status) {
  const map = {
    'Pending': 'status-pending',
    'In Transit': 'status-transit',
    'Delivered': 'status-delivered',
  };
  return `<span class="status ${map[status] || 'status-pending'}">${status}</span>`;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function escAttr(s) { return s.replace(/'/g, "\\'"); }

function showModal(id, html) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}

function closeModal() {
  const m = document.getElementById('active-modal');
  if (m) m.remove();
}

let _toastTimer;
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function copyText(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = orig, 1500);
  });
}
