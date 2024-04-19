const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS 
    },
});

const sendEmail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: 'noreply@amapp.com', 
            to: to,
            subject: subject,
            html: html,
        });
        logger.info(`Email sent successfully to ${to}`);
    } catch (error) {
        logger.error('Failed to send email', { error: error.message, stack: error.stack });
    }
};

module.exports = { sendEmail };