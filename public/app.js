const productGrid = document.getElementById('productGrid');
const cartButton = document.getElementById('cartButton');
const cartPanel = document.getElementById('cartPanel');
const closeCart = document.getElementById('closeCart');
const cartItemsContainer = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutForm = document.getElementById('checkoutForm');
const checkoutMessage = document.getElementById('checkoutMessage');
const yearEl = document.getElementById('year');

yearEl.textContent = new Date().getFullYear();

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function loadCart() {
  try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function getQuantityInput(fragment, defaultValue = 1) {
  const input = fragment.querySelector('input.qty-input');
  return Number(input?.value || defaultValue) || defaultValue;
}

async function fetchProducts() {
  const res = await fetch('/api/products');
  return res.json();
}

function renderProducts(products) {
  productGrid.innerHTML = '';
  for (const product of products) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${product.imageUrl || 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800&auto=format&fit=crop'}" alt="${product.name}">
      <div class="card-body">
        <div class="card-title">
          <div>
            <div>${product.name}</div>
            <div class="muted">${product.category || 'General'} • ${product.unit || 'unit'}</div>
          </div>
          <div class="price">${formatCurrency(product.price)}</div>
        </div>
        <div class="card-actions">
          <div class="qty">
            <button class="decrease" aria-label="Decrease">−</button>
            <input class="qty-input" type="number" min="1" value="1"/>
            <button class="increase" aria-label="Increase">+</button>
          </div>
          <button class="primary-btn add-to-cart">Add</button>
        </div>
      </div>
    `;
    const decrease = card.querySelector('.decrease');
    const increase = card.querySelector('.increase');
    const qtyInput = card.querySelector('.qty-input');
    const addButton = card.querySelector('.add-to-cart');
    decrease.addEventListener('click', () => {
      const val = Math.max(1, (Number(qtyInput.value) || 1) - 1);
      qtyInput.value = String(val);
    });
    increase.addEventListener('click', () => {
      const val = Math.max(1, (Number(qtyInput.value) || 1) + 1);
      qtyInput.value = String(val);
    });
    addButton.addEventListener('click', () => addToCart(product, getQuantityInput(card)));
    productGrid.appendChild(card);
  }
}

function addToCart(product, quantity) {
  const cart = loadCart();
  const existing = cart.find(item => item.productId === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ productId: product.id, name: product.name, price: product.price, quantity });
  }
  saveCart(cart);
  updateCartUI();
  openCart();
}

function removeFromCart(productId) {
  const cart = loadCart().filter(item => item.productId !== productId);
  saveCart(cart);
  updateCartUI();
}

function updateCartUI() {
  const cart = loadCart();
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartItemsContainer.innerHTML = '';
  for (const item of cart) {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div>
        <div><strong>${item.name}</strong></div>
        <div class="muted">${item.quantity} × ${formatCurrency(item.price)}</div>
      </div>
      <div>
        <div>${formatCurrency(item.price * item.quantity)}</div>
        <button class="icon-btn" aria-label="Remove">🗑️</button>
      </div>
    `;
    row.querySelector('button').addEventListener('click', () => removeFromCart(item.productId));
    cartItemsContainer.appendChild(row);
  }
  cartTotalEl.textContent = formatCurrency(total);
  const count = cart.reduce((n, i) => n + i.quantity, 0);
  cartCount.textContent = String(count);
}

function openCart() { cartPanel.classList.add('open'); cartPanel.setAttribute('aria-hidden', 'false'); }
function closeCartPanel() { cartPanel.classList.remove('open'); cartPanel.setAttribute('aria-hidden', 'true'); }

cartButton.addEventListener('click', openCart);
closeCart.addEventListener('click', closeCartPanel);

checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  checkoutMessage.textContent = '';
  const cart = loadCart();
  if (cart.length === 0) {
    checkoutMessage.textContent = 'Your cart is empty.';
    return;
  }
  const formData = new FormData(checkoutForm);
  const payload = {
    items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
    customer: {
      name: formData.get('name'),
      email: formData.get('email'),
      address: formData.get('address')
    }
  };
  try {
    const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Order failed');
    checkoutMessage.textContent = 'Order placed! We\'ve emailed a confirmation.';
    localStorage.removeItem('cart');
    updateCartUI();
  } catch (err) {
    checkoutMessage.textContent = err.message || 'Something went wrong.';
  }
});

(async function init() {
  try {
    const products = await fetchProducts();
    // Seed with demo products in case none exist (first run)
    if (!products || products.length === 0) {
      const demo = [
        { name: 'Organic Tomatoes', price: 3.5, unit: 'lb', category: 'Vegetables', imageUrl: 'https://images.unsplash.com/photo-1546470427-e5b09dc1111b?w=800&auto=format&fit=crop' },
        { name: 'Free-range Eggs', price: 5.0, unit: 'dozen', category: 'Dairy', imageUrl: 'https://images.unsplash.com/photo-1498654077810-12b21aa1e5b1?w=800&auto=format&fit=crop' },
        { name: 'Raw Honey', price: 9.0, unit: '16 oz jar', category: 'Pantry', imageUrl: 'https://images.unsplash.com/photo-1505575972945-2804b50f740f?w=800&auto=format&fit=crop' },
        { name: 'Fresh Kale', price: 2.0, unit: 'bunch', category: 'Greens', imageUrl: 'https://images.unsplash.com/photo-1563480690463-85e6a455ba7b?w=800&auto=format&fit=crop' }
      ];
      for (const p of demo) {
        await fetch('/api/products?apiKey=devkey', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
      }
    }
    const updated = await fetchProducts();
    renderProducts(updated);
    updateCartUI();
  } catch (err) {
    productGrid.innerHTML = `<div>Failed to load products.</div>`;
  }
})();

