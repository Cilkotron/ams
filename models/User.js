const mongoose = require('mongoose');
const crypto = require('crypto'); // Added for generating apiKey
const validator = require('validator'); // Import validator for email validation

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
  email: { 
    type: String, 
    unique: true, 
    required: [true, 'Email is required'], 
    lowercase: true,
    validate: {
      validator: function(email) {
        return validator.isEmail(email);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  password: { type: String, required: true },
  credits: { type: Number, default: 0 },
  stripeCustomerId: { type: String, default: null },
  autoReplenish: { type: Boolean, default: false },
  autoReplenishCredits: { type: Number, default: 5000 },
  autoReplenishThreshold: { type: Number, default: 30000 },
  apiKey: { type: String, unique: true, default: () => `ak_${crypto.randomBytes(16).toString('hex')}` },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  lastActivity: { type: Date, default: Date.now }, // Track the last activity time of the user
  isAdmin: { type: Boolean, default: false } // Flag to indicate if the user has admin privileges
});

const User = mongoose.model('User', userSchema);

module.exports = User;