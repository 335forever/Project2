const express = require('express');
const router = express.Router();
const { updateDeviceStatus,notiHumidityChange,notiTemperatureChange } = require('../controllers/deviceController');

router.post('/update', updateDeviceStatus);
router.post('/noti/humidity', notiHumidityChange);
router.post('/noti/temperature', notiTemperatureChange);

module.exports = router;
