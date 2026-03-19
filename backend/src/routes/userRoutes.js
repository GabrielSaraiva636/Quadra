const express = require('express');
const usersController = require('../controllers/usersController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireRole('admin'));

router.get('/', usersController.listUsers);
router.post('/', usersController.createUser);
router.put('/:id', usersController.updateUser);

module.exports = router;
