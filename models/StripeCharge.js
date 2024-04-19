const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const winston = require('winston');

// Logger setup with winston
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'stripe-charge-service' },
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

const stripeChargeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  stripeChargeId: { type: String, required: true },
  amount: { type: Number, required: true },
  creditsUsed: { type: Number, required: true }, // Added field for tracking credits used
  timestamp: { type: Date, default: Date.now }
});

stripeChargeSchema.pre('save', function(next) {
  logger.info(`Saving Stripe charge for user ${this.userId} with amount ${this.amount} and credits used ${this.creditsUsed}`);
  next();
});

stripeChargeSchema.post('save', function(error, doc, next) {
  if (error) {
    logger.error(`Error saving Stripe charge for user ${this.userId}: ${error.stack}`);
    next(error);
  } else {
    logger.info(`Stripe charge for user ${this.userId} saved successfully with credits used ${doc.creditsUsed}`);
    next();
  }
});

module.exports = mongoose.model('StripeCharge', stripeChargeSchema);