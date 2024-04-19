const winston = require('winston');

const logger = winston.createLogger({
  level: 'debug', // Changed level from 'info' to 'debug' to capture more detailed logs
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(info => {
          return `${info.timestamp} ${info.level}: ${info.message} ${info.stack ? info.stack : ''}`;
        })
      )
    })
  ]
});

module.exports = logger;