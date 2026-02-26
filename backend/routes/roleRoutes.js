const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');

router.get('/', roleController.getAll);
// autres routes si besoin

module.exports = router;