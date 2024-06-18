const mqtt = require('mqtt');
const config = require('../config').mqtt;

const options = {
  ca: config.caFile,
  cert: config.certFile,
  key: config.keyFile,
  rejectUnauthorized: true
};

module.exports = mqtt.connect(config.brokerUrl,options);