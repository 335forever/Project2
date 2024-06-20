const mailService = require('../services/mailService')
const mqttService = require('../services/mqttService')

const updateDeviceStatus = async (req, res) => {
  try {
    const deviceId = req.body.id;
    const deviceStatus = req.body.status;
    
    const respond = await mqttService.update(deviceId,deviceStatus);
    
    res.status(200).json({msg:respond});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const notiHumidityChange = async (req, res) => {
  try {
    const humidity = req.body.humidity;
    const humidityChangePercent = req.body.humidityChangePercent;
    
    await mailService.sendNotiForHumidity(humidity,humidityChangePercent);

    res.status(200).json({msg:'success'});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const notiTemperatureChange = async (req, res) => {
  try {
    const temperature = req.body.temperature;
    const temperatureChangePercent = req.body.temperatureChangePercent;
    
    await mailService.sendNotiForTemperature(temperature,temperatureChangePercent);

    res.status(200).json({msg:'success'});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
    updateDeviceStatus,
    notiHumidityChange,
    notiTemperatureChange
}