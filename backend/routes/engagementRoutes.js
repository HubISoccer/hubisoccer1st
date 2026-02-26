const express = require('express');
const router = express.Router();
const engagementController = require('../controllers/engagementController');

router.get('/', engagementController.getAll);
router.post('/', engagementController.create);
router.put('/:id', engagementController.update);
router.delete('/:id', engagementController.delete);

module.exports = router;