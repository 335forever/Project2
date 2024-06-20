const { pool } = require('../utils/db');

module.exports = { 
    getDHTData: async (nums) => {
        if (nums != undefined) {
            const connection = await pool.getConnection();
            const [rows] = await connection.execute(
                "SELECT * FROM dht_data ORDER BY created_at DESC LIMIT ?",
                [nums]
            );
            // Sắp xếp lại mảng rows theo chiều tăng dần của created_at
            rows.sort((a, b) => {
                return new Date(a.created_at) - new Date(b.created_at);
            });
            connection.release();
            return rows;
        } else {
            throw new Error('Missing nums');
        }
    },
    getDevicesInfo: async () => {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute("SELECT * FROM devices");
        connection.release();
        return rows;
    }
}