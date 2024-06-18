const express = require('express');
const router = express.Router();
const { updateDeviceStatus } = require('../controllers/deviceController');

router.post('/update', updateDeviceStatus);

module.exports = router;
