const db = require('../config/db');
const { AppError, asyncHandler } = require('../utils/errors');

const listProducts = asyncHandler(async (req, res) => {
  const { q, active_only } = req.query;
  const where = [];
  const params = [];

  if (q) {
    where.push('p.name LIKE ?');
    params.push(`%${q}%`);
  }

  if (active_only === '1') {
    where.push('p.active = 1');
  }

  const rows = await db.query(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY p.name`,
    params
  );

  res.json(rows);
});

const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    category,
    stock_quantity: stockQuantity = 0,
    min_quantity: minQuantity = 0,
    sale_price: salePrice,
    cost_price: costPrice,
    active = 1
  } = req.body;

  if (!name || !category || salePrice == null || costPrice == null) {
    throw new AppError('Campos obrigatorios: name, category, sale_price, cost_price.', 400);
  }

  const result = await db.query(
    `INSERT INTO products
      (name, category, stock_quantity, min_quantity, sale_price, cost_price, active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      Number(category),
      Number(stockQuantity),
      Number(minQuantity),
      Number(salePrice),
      Number(costPrice),
      Number(active)
    ]
  );

  const created = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
  res.status(201).json(created[0]);
});

const updateProduct = asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const rows = await db.query('SELECT * FROM products WHERE id = ? LIMIT 1', [productId]);
  if (!rows[0]) {
    throw new AppError('Produto nao encontrado.', 404);
  }

  const current = rows[0];
  const payload = {
    name: req.body.name || current.name,
    category: req.body.category != null ? Number(req.body.category) : Number(current.category),
    stock_quantity: req.body.stock_quantity != null ? Number(req.body.stock_quantity) : Number(current.stock_quantity),
    min_quantity: req.body.min_quantity != null ? Number(req.body.min_quantity) : Number(current.min_quantity),
    sale_price: req.body.sale_price != null ? Number(req.body.sale_price) : Number(current.sale_price),
    cost_price: req.body.cost_price != null ? Number(req.body.cost_price) : Number(current.cost_price),
    active: req.body.active != null ? Number(req.body.active) : Number(current.active)
  };

  await db.query(
    `UPDATE products
     SET name = ?, category = ?, stock_quantity = ?, min_quantity = ?,
         sale_price = ?, cost_price = ?, active = ?
     WHERE id = ?`,
    [
      payload.name,
      payload.category,
      payload.stock_quantity,
      payload.min_quantity,
      payload.sale_price,
      payload.cost_price,
      payload.active,
      productId
    ]
  );

  const updated = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
  res.json(updated[0]);
});

const adjustStock = asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const { movement_type_id: movementTypeId, quantity } = req.body;

  if (!movementTypeId || quantity == null) {
    throw new AppError('Campos obrigatorios: movement_type_id, quantity.', 400);
  }

  const conn = await db.pool.getConnection();

  try {
    await conn.beginTransaction();

    const [products] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [productId]);
    if (!products[0]) {
      throw new AppError('Produto nao encontrado.', 404);
    }

    const product = products[0];
    let nextStock = Number(product.stock_quantity);
    const qty = Number(quantity);
    const mt = Number(movementTypeId);

    if (mt === 1) {
      nextStock += qty;
    } else if (mt === 2) {
      if (qty > nextStock) {
        throw new AppError('Estoque insuficiente para saida.', 409);
      }
      nextStock -= qty;
    } else if (mt === 3) {
      if (qty < 0) {
        throw new AppError('Quantidade de ajuste deve ser >= 0.', 400);
      }
      nextStock = qty;
    } else {
      throw new AppError('movement_type_id invalido.', 400);
    }

    await conn.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [nextStock, productId]);
    await conn.query(
      `INSERT INTO stock_movements
        (product_id, stock_movements_type_id, quantity, created_by)
       VALUES (?, ?, ?, ?)`,
      [productId, mt, qty, req.user.id]
    );

    await conn.commit();

    const [updated] = await conn.query('SELECT * FROM products WHERE id = ?', [productId]);
    res.json(updated[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const stockMovementsHistory = asyncHandler(async (req, res) => {
  const { product_id: productId } = req.query;

  const where = [];
  const params = [];
  if (productId) {
    where.push('sm.product_id = ?');
    params.push(Number(productId));
  }

  const rows = await db.query(
    `SELECT
      sm.*,
      p.name AS product_name,
      smt.description AS movement_type,
      u.name AS user_name
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     JOIN stock_movements_type smt ON smt.id = sm.stock_movements_type_id
     JOIN users u ON u.id = sm.created_by
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY sm.created_at DESC
     LIMIT 500`,
    params
  );

  res.json(rows);
});

module.exports = {
  listProducts,
  createProduct,
  updateProduct,
  adjustStock,
  stockMovementsHistory
};
