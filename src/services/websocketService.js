const WebSocket = require('ws');
const wss = require('../utils/websocket');

module.exports = {
  sendToWebSocketClients: (data) => {
    if (!wss) return;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
};
