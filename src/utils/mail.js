const nodemailer = require('nodemailer');
const config = require('../config').mailer;

module.exports = nodemailer.createTransport(config);