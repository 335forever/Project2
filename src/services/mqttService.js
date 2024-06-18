const { pool } = require('../utils/db');
const { sendToWebSocketClients } = require('./websocketService');
const client = require('../utils/mqtt');

client.on('connect', () => {
  client.subscribe('esp32/pub', (err) => {
    if (err) {
      console.error('Error subscribing to topic:', err);
    }
  });
});

client.on('message', async (topic, message) => {
  let dhtData;
  try {
    dhtData = JSON.parse(message.toString());
    dhtData.current_time = new Date();
  } catch (err) {
    console.error('Error parsing MQTT message:', err);
    return;
  }

  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM dht_data');
    const recordCount = rows[0].count;

    if (recordCount >= 100) {
      await connection.execute('DELETE FROM dht_data ORDER BY created_at ASC LIMIT 1');
    }

    const { temperature, humidity, current_time } = dhtData;
    await connection.execute(
      'INSERT INTO dht_data (temperature, humidity, created_at) VALUES (?, ?, ?)',
      [temperature, humidity, current_time]
    );

    connection.release();
  } catch (err) {
    console.error('Error handling data in the database:', err);
    return;
  }

  sendToWebSocketClients(dhtData);
});

const publish = async (topic,message) => {
  client.publish(topic, message, function (err) {
    if (err) {
        console.error('Failed to publish message:', err);
    }
});
}

module.exports = { publish }