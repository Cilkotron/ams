const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto'); // Added for generating apiKey

// Logger setup with winston
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true }, // Added email field
  password: { type: String, required: true },
  credits: { type: Number, default: 0 },
  stripeCustomerId: { type: String, default: null },
  autoReplenish: { type: Boolean, default: false },
  autoReplenishCredits: { type: Number, default: 5000 },
  autoReplenishThreshold: { type: Number, default: 30000 },
  apiKey: { type: String, unique: true, default: () => `ak_${crypto.randomBytes(16).toString('hex')}` } // Modified apiKey field
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    try {
      const saltRounds = 10; // Ensure salt rounds are consistent across the application
      const hash = await bcrypt.hash(this.password, saltRounds);
      this.password = hash;
      logger.info('Password hashed successfully for user: %s', this.username);
    } catch (error) {
      logger.error('Error hashing password for user: %s - %s', this.username, error.message, { trace: error.stack });
      next(error);
      return;
    }
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;