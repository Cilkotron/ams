const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Switched to bcryptjs for password hashing
const crypto = require('crypto'); // Added for generating apiKey

// Logger setup with winston
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, lowercase: true },
  email: { type: String, unique: true, required: true, lowercase: true },
  password: { type: String, required: true },
  credits: { type: Number, default: 0 },
  stripeCustomerId: { type: String, default: null },
  autoReplenish: { type: Boolean, default: false },
  autoReplenishCredits: { type: Number, default: 5000 },
  autoReplenishThreshold: { type: Number, default: 30000 },
  apiKey: { type: String, unique: true, default: () => `ak_${crypto.randomBytes(16).toString('hex')}` }
});

const User = mongoose.model('User', userSchema);

module.exports = User;