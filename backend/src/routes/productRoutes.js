const express = require('express');
const productsController = require('../controllers/productsController');

const router = express.Router();

router.get('/', productsController.listProducts);
router.post('/', productsController.createProduct);
router.put('/:id', productsController.updateProduct);
router.post('/:id/adjust-stock', productsController.adjustStock);
router.get('/stock/movements', productsController.stockMovementsHistory);

module.exports = router;
