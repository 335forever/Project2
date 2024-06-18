const express = require('express');
const bodyParser = require('body-parser');
const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const mysql = require('mysql2/promise');
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

const PORT = 3000; // Port mà máy chủ sẽ lắng nghe

const dbConfig = {
    host: "localhost",
    user: "quan",
    password: "335forever",
    database: "database_for_prj2"
};

// Tạo một pool kết nối
const pool = mysql.createPool(dbConfig);

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
client.on('message', async (topic, message) => {
    let dhtDataFromBroker;
    try {
        dhtDataFromBroker = JSON.parse(message.toString());
        dhtDataFromBroker.current_time = new Date(); // Thêm thời gian hiện tại
    } catch (err) {
        console.error('Error parsing MQTT message:', err);
        return;
    }
    
    console.log(dhtDataFromBroker);
    
    try {
        const connection =  await pool.getConnection();

        // Kiểm tra số lượng bản ghi hiện tại
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM dht_data');
        const recordCount = rows[0].count;

        // Nếu đủ 100 bản ghi thì xóa bản ghi cũ nhất
        if (recordCount >= 100) {
            await connection.execute('DELETE FROM dht_data ORDER BY created_at ASC LIMIT 1');
        }

        // Thêm bản ghi mới
        const { temperature, humidity, current_time } = dhtDataFromBroker;
        await connection.execute(
            'INSERT INTO dht_data (temperature, humidity, created_at) VALUES (?, ?, ?)',
            [temperature, humidity, current_time]
        );

        connection.release();
    } catch (err) {
        console.error('Error handling data in the database:', err);
        return;
    }

    // Gửi dữ liệu mới đến tất cả các kết nối WebSocket khi có dữ liệu mới
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(dhtDataFromBroker));
      }
    });
});

client.on('publish', (packet) => {
    console.log('Published message:', packet.payload);
});


// Lấy lịch sử dữ liệu của dht
app.get('/api/getdhtdata', async (req, res) => {
    try {
        const nums = req.query.nums;
        
        if (nums == undefined) {
            const connection = await pool.getConnection();

            const [rows] = await connection.execute(
                "SELECT * FROM dht_data ORDER BY created_at DESC LIMIT ?",
                [nums]
            );

            res.status(200).json( rows );

            connection.release();  
        }  
        else {
            res.status(400).json({ error: 'Missing nums' });
        }
    } catch (error) {
        console.error('Get dht data fail:', error);
        res.status(500).json({ error: 'Get dht data fail' });
    }
});

// Lấy lịch sử dữ liệu của devices
app.get('/api/getdevicesinfo', async (req, res) => {
    try {
        const connection = await pool.getConnection();

        const [rows] = await connection.execute("SELECT * FROM devices");

        res.status(200).json( rows );

        connection.release();  
    } catch (error) {
        console.error('Get devices info fail:', error);
        res.status(500).json({ error: 'Get devices info fail' });
    }
});

// Khởi động máy chủ
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
