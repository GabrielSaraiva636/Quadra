const express = require('express');
const paymentsController = require('../controllers/paymentsController');

const router = express.Router();

router.get('/', paymentsController.listPayments);
router.post('/', paymentsController.registerPayment);

module.exports = router;
