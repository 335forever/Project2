const WebSocket = require('ws');
const config = require('../config').wsPort;

module.exports = new WebSocket.Server({ port: config });
