const { pool } = require('../utils/db');
const mqttService = require('./mqttService');

module.exports = { 
    update: async (deviceId,deviceStatus) => {
        if (deviceId != undefined && deviceStatus == 0 || deviceStatus == 1) {
            const connection = await pool.getConnection();
            
            const [device] =  await connection.execute(
                'SELECT * FROM devices WHERE id = ?',
                [deviceId]
            );
            if (device.length == 0) 
                throw new Error('Invalid deviceId');
            
            const topic = 'deviceStatus';
            const message = JSON.stringify({
                gpio:device[0].gpio,
                status:deviceStatus
            });
            await mqttService.publish(topic,message);
            
            await connection.execute(
                "UPDATE devices SET status = ? WHERE id = ?",
                [deviceStatus,deviceId]
            );

            connection.release();
            return true;
        } else {
            throw new Error('Missing deviceId or deviceStatus');
        }
    }
}