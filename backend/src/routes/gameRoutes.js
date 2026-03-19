const express = require('express');
const gamesController = require('../controllers/gamesController');

const router = express.Router();

router.get('/', gamesController.listGames);
router.post('/', gamesController.createGame);
router.get('/:id/overview', gamesController.gameOverview);
router.get('/:id/payers', gamesController.gamePayersDetails);
router.put('/:id', gamesController.updateGame);
router.delete('/:id', gamesController.deleteGame);

module.exports = router;
