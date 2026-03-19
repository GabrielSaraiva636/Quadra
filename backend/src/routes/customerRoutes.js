const express = require('express');
const customersController = require('../controllers/customersController');

const router = express.Router();

router.get('/games/:gameId/customers', customersController.listGameCustomers);
router.post('/games/:gameId/customers', customersController.createGameCustomer);
router.patch('/games/:gameId/customers/:customerId', customersController.updateGameCustomer);
router.post('/customer-items', customersController.addCustomerItem);
router.get('/customers/:customerId/details', customersController.customerDetails);

module.exports = router;
