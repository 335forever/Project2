const mailer = require('../utils/mail');
require('dotenv').config();

module.exports = {
    sendNotiForHumidity: async (humidity,humidityChangePercent) => {
        let textContent = `Xin chào,\n\nHệ thống kiểm soát vườn của bạn vừa phát hiện một sự thay đổi lớn về độ ẩm.\n\nĐộ ẩm hiện tại: ${humidity}%\nPhần trăm thay đổi: ${humidityChangePercent}%\n\nVui lòng kiểm tra hệ thống và đảm bảo rằng mọi thứ đang hoạt động bình thường.\n\nTrân trọng,\nHệ thống kiểm soát vườn`;
        
        let mailOptions = {
            from: process.env.ADMIN_EMAIL,
            to: process.env.USER_EMAIL,
            subject: 'HỆ THỐNG KIỂM SOÁT VƯỜN THÔNG BÁO',
            text: textContent
        };
        
        await mailer.sendMail(mailOptions);
    },
    sendNotiForTemperature: async (temperature,temperatureChangePercent) => {
        let textContent = `Xin chào,\n\nHệ thống kiểm soát vườn của bạn vừa phát hiện một sự thay đổi lớn về nhiệt độ.\n\nNhiệt độ hiện tại: ${temperature}°C\nPhần trăm thay đổi: ${temperatureChangePercent}%\n\nVui lòng kiểm tra hệ thống và đảm bảo rằng mọi thứ đang hoạt động bình thường.\n\nTrân trọng,\nHệ thống kiểm soát vườn`;
        
        let mailOptions = {
            from: process.env.ADMIN_EMAIL,
            to: process.env.USER_EMAIL,
            subject: 'HỆ THỐNG KIỂM SOÁT VƯỜN THÔNG BÁO',
            text: textContent
        };
        
        await mailer.sendMail(mailOptions);
    }
}