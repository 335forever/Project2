const deviceService = require('../services/deviceService')

const updateDeviceStatus = async (req, res) => {
  try {
    const deviceId = req.body.id;
    const deviceStatus = req.body.status;
    
    await deviceService.update(deviceId,deviceStatus);
    
    res.status(200).json({msg:'success'});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
    updateDeviceStatus
}