const fs = require('fs');

module.exports = {
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER || 'mqtts://a69vcsde92392-ats.iot.ap-southeast-1.amazonaws.com',
    caFile: fs.readFileSync(process.env.MQTT_CA_FILE || './key/AmazonRootCA1.pem'),
    certFile: fs.readFileSync(process.env.MQTT_CERT_FILE || './key/Device Certificate.crt'),
    keyFile: fs.readFileSync(process.env.MQTT_KEY_FILE || './key/Private Key.key')
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'quan',
    password: process.env.DB_PASSWORD || '335forever',
    database: process.env.DB_NAME || 'database_for_prj2',
    charset: 'utf8mb4'
  },
  wsPort: process.env.WS_PORT || 8080
};
