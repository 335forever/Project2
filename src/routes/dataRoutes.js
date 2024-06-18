const express = require('express');
const router = express.Router();
const { getDHTData, getDevicesInfo } = require('../controllers/dataController');

router.get('/getdhtdata', getDHTData);
router.get('/getdevicesinfo', getDevicesInfo);

module.exports = router;
