const express = require('express');
const bodyParser = require('body-parser');
const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const PORT = 3000; // Port mà máy chủ sẽ lắng nghe

// Đường dẫn đến các key và certificates
const privateKeyPath = path.join(__dirname, 'key/Private Key.key');
const certificatePath = path.join(__dirname, 'key/Device Certificate.crt');
const caCertPath = path.join(__dirname, 'key/AmazonRootCA1.pem');

// Nội dung của các key và certificates
const privateKey = fs.readFileSync(privateKeyPath);
const certificate = fs.readFileSync(certificatePath);
const caCert = fs.readFileSync(caCertPath);

// Kết nối tới MQTT Broker trên AWS với các key và certificates
const client = mqtt.connect('mqtts://a35pbnsp86wcye-ats.iot.ap-southeast-1.amazonaws.com', {
    key: privateKey,
    cert: certificate,
    ca: caCert
});

const wss = new WebSocket.Server({ port: 8080 });

let mqttData = {}; // Lưu trữ dữ liệu từ MQTT Broker

wss.on('connection', function connection(ws) {
    console.log('Client connected');
  
    // Gửi dữ liệu hiện tại đến client khi có kết nối mới
    ws.send(JSON.stringify(mqttData));

    // Xử lý sự kiện message từ client
    ws.on('message', function incoming(message) {
        console.log('Received message from client:', message);

        // Kiểm tra xem message có phải là một chuỗi JSON hợp lệ không
        try {
            const newData = JSON.parse(message);
            const temperature = newData.temperature;
            const humidity = newData.humidity;

            const dataToPublish = {
                temperature: temperature,
                humidity: humidity
            };

            const messageToPublish = JSON.stringify(dataToPublish);
            client.publish('esp32/sub', messageToPublish);
            console.log('Published message:', messageToPublish);
        } catch (error) {
            console.error('Error parsing message:', error.message);
        }
    });
});


// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Kết nối tới MQTT Broker và đăng ký topic 'esp32/pub'
client.on('connect', () => {
    console.log('Connected to MQTT Broker');
    client.subscribe('esp32/pub', (err) => {
        if (err) {
            console.error('Error subscribing to topic:', err);
        } else {
            console.log('Subscribed to topic "esp32/pub"');
        }
    });
});

// Xử lý dữ liệu từ MQTT Broker
client.on('message', (topic, message) => {
    //console.log(`Received data from MQTT Broker on topic ${topic}: ${message.toString()}`);
    mqttData = JSON.parse(message.toString());
  
    // Gửi dữ liệu mới đến tất cả các kết nối WebSocket khi có dữ liệu mới
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(mqttData));
      }
    });
});

client.on('publish', (packet) => {
    console.log('Published message:', packet.payload);
});

// Khởi động máy chủ
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
