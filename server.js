import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'devkey';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PRODUCTS_FILE)) {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
  }
}

function readJsonSafe(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    return [];
  }
}

function writeJsonSafe(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Products
app.get('/api/products', (_req, res) => {
  const products = readJsonSafe(PRODUCTS_FILE);
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const apiKey = req.header('x-api-key') || req.query.apiKey;
  if (apiKey !== ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { name, price, unit, stock, imageUrl, description, category } = req.body || {};
  if (!name || typeof price !== 'number') {
    return res.status(400).json({ error: 'Missing required fields: name, price' });
  }
  const products = readJsonSafe(PRODUCTS_FILE);
  const newProduct = {
    id: Date.now().toString(36),
    name,
    price,
    unit: unit || 'unit',
    stock: typeof stock === 'number' ? stock : 100,
    imageUrl: imageUrl || '',
    description: description || '',
    category: category || 'General',
    createdAt: new Date().toISOString()
  };
  products.push(newProduct);
  writeJsonSafe(PRODUCTS_FILE, products);
  res.status(201).json(newProduct);
});

// Orders
app.post('/api/orders', (req, res) => {
  const { items, customer } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must include items' });
  }
  const products = readJsonSafe(PRODUCTS_FILE);
  const productById = new Map(products.map(p => [p.id, p]));
  let total = 0;
  const normalizedItems = [];
  for (const item of items) {
    const product = productById.get(item.productId);
    const quantity = Number(item.quantity) || 0;
    if (!product || quantity <= 0) continue;
    const lineTotal = product.price * quantity;
    total += lineTotal;
    normalizedItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      lineTotal
    });
  }
  if (normalizedItems.length === 0) {
    return res.status(400).json({ error: 'No valid items in order' });
  }
  const orders = readJsonSafe(ORDERS_FILE);
  const newOrder = {
    id: 'ord_' + Date.now().toString(36),
    items: normalizedItems,
    total,
    customer: customer || {},
    createdAt: new Date().toISOString(),
    status: 'received'
  };
  orders.push(newOrder);
  writeJsonSafe(ORDERS_FILE, orders);
  res.status(201).json({ ok: true, order: newOrder });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

ensureDataFiles();
app.listen(PORT, () => {
  console.log(`Nature Connect Market server running on http://localhost:${PORT}`);
});

