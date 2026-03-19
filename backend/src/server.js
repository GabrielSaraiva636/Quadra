const path = require('path');
const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const db = require('./config/db');
const { authMiddleware } = require('./middleware/auth');
const errorMiddleware = require('./middleware/error');
const { ensureAdminUser } = require('./services/bootstrapService');
const { ensureSchema } = require('./services/schemaService');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const gameRoutes = require('./routes/gameRoutes');
const productRoutes = require('./routes/productRoutes');
const customerRoutes = require('./routes/customerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const cashRoutes = require('./routes/cashRoutes');
const indicatorRoutes = require('./routes/indicatorRoutes');

const authController = require('./controllers/authController');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res, next) => {
  try {
    await db.query('SELECT 1 AS ok');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRoutes);

app.use('/api', authMiddleware);
app.get('/api/auth/me', authController.me);
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/products', productRoutes);
app.use('/api', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cash-register', cashRoutes);
app.use('/api/indicators', indicatorRoutes);

const frontendPath = path.resolve(__dirname, '../../frontend');
app.use(express.static(frontendPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  return res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use(errorMiddleware);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDatabase(maxAttempts = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await db.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        throw err;
      }
      console.log(`Database not ready (attempt ${attempt}/${maxAttempts}), retrying...`);
      await sleep(delayMs);
    }
  }
}

async function start() {
  try {
    await waitForDatabase();
    await ensureSchema();
    await ensureAdminUser();
    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
