const dataService = require('../services/dataService')

const getDHTData = async (req, res) => {
  try {
    const nums = req.query.nums;
    const DHTData = await dataService.getDHTData(nums);
    res.status(200).json(DHTData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getDevicesInfo = async (req, res) => {
  try {
    const devicesInfo = await dataService.getDevicesInfo();
    res.status(200).json(devicesInfo);
  } catch (error) {
    console.error('Get devices info fail:', error);
    res.status(500).json({ error: 'Get devices info fail' });
  }
};

module.exports = {
  getDHTData, getDevicesInfo
}