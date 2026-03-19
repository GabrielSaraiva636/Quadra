const express = require('express');
const indicatorsController = require('../controllers/indicatorsController');

const router = express.Router();

router.get('/game/:gameId', indicatorsController.indicatorsByGame);
router.get('/monthly', indicatorsController.monthlyIndicators);
router.get('/stock', indicatorsController.stockIndicators);
router.get('/commission', indicatorsController.commissionReport);

module.exports = router;
