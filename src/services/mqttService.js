const { pool } = require('../utils/db');
const { sendToWebSocketClients } = require('./websocketService');
const client = require('../utils/mqtt');
const { v4: uuidv4 } = require('uuid');

let ackMap = new Map();

client.on('connect', () => {
  client.subscribe('dhtData', (err) => {
    if (!err) {
      console.log('Subscribed to dhtData');
    }
  });
  client.subscribe('deviceStatus/ack', (err) => {
    if (!err) {
      console.log('Subscribed to deviceStatus/ack');
    }
  });
});

client.on('message', async (topic, message) => {
  
  if (topic === 'deviceStatus/ack') {
    const ackMessage = JSON.parse(message.toString());
    const { uuid, status, id } = ackMessage;
    if (ackMap.has(uuid)) {
      ackMap.get(uuid)(true);
      ackMap.delete(uuid);
    }
  }
  
  if (topic ===  'dhtData') {
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
  }
});

const publish = async (topic,message) => {
  client.publish(topic, message, function (err) {
    if (err) {
        console.error('Failed to publish message:', err);
    }
});
}

const update = async (deviceId,deviceStatus) => {
  if (deviceId != undefined && (deviceStatus == 0 || deviceStatus == 1)) {
    const connection = await pool.getConnection();
    
    const [device] =  await connection.execute(
        'SELECT * FROM devices WHERE id = ?',
        [deviceId]
    );
    if (device.length == 0) 
        throw new Error('Invalid deviceId');
    
    const uuid = uuidv4();
    const topic = 'deviceStatus';
    const message = JSON.stringify({
        gpio:device[0].gpio,
        status:deviceStatus,
        uuid: uuid
    });
    
    await publish(topic,message);

    // Đợi phản hồi từ ESP32
    const waitAck = new Promise((resolve) => {
        ackMap.set(uuid, resolve);
        setTimeout(() => {
          if (ackMap.has(uuid)) {
              ackMap.delete(uuid);
              resolve(false);
          }
        }, 10000); // Timeout 10 giây để nhận ACK
    });

    const ack = await waitAck;
    if (!ack) {
      connection.release();
      return false; // Trả về false nếu không nhận được ACK
    }

    await connection.execute(
      'UPDATE devices SET status = ? WHERE id = ?',
      [deviceStatus, deviceId]
    );

    const data = {
      id: device[0].id,
      status: deviceStatus
    }
    sendToWebSocketClients(data);
    connection.release();
    return true;
  } else {
      throw new Error('Missing deviceId or deviceStatus');
  }
}

module.exports = { publish,update }