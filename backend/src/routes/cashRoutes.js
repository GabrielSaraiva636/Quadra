const express = require('express');
const cashController = require('../controllers/cashController');

const router = express.Router();

router.post('/open', cashController.openCashRegister);
router.get('/today', cashController.todayCashSummary);

module.exports = router;
