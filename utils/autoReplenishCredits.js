const User = require('../models/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../utils/logger');
const { sendCreditUpdate } = require('./socketHandler'); // Import the function to send credit updates via WebSocket
const { sendEmail } = require('./emailSender'); // Import the email sender utility

async function checkAndTriggerAutoReplenish() {
  try {
    const users = await User.find({});
    for (const user of users) {
      if (user.credits < user.autoReplenishThreshold && user.autoReplenish) {
        const chargeAmount = user.autoReplenishCredits * 100; // Stripe requires amount in cents
        try {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: chargeAmount,
            currency: 'usd',
            customer: user.stripeCustomerId,
            description: `Auto-replenish for ${user.autoReplenishCredits} credits`,
            metadata: { userId: user._id.toString() },
          });
          user.credits += user.autoReplenishCredits;
          await user.save();
          logger.info(`Auto-replenished ${user.autoReplenishCredits} credits for user ${user._id}. New balance: ${user.credits}`);
          sendCreditUpdate(user._id.toString(), user.credits); // Send the updated credits to the user via WebSocket

          // Send an email notification for auto-replenish trigger
          await sendEmail(user.email, 'Auto-Replenish Triggered', `Your account has been auto-replenished with ${user.autoReplenishCredits} credits. New balance: ${user.credits}.`)
            .catch(error => logger.error('Failed to send auto-replenish email', { error: error.message, stack: error.stack }));

        } catch (stripeError) {
          logger.error('Stripe charge for auto-replenish failed', { error: stripeError.message, stack: stripeError.stack });
        }
      } else if (user.credits < 1000) {
        // Send an email notification if credits fall below 1000
        await sendEmail(user.email, 'Low Credits Warning', `You have less than 1000 credits in your account. Your current balance is ${user.credits}. Please consider purchasing more credits.`)
          .catch(error => logger.error('Failed to send low credits warning email', { error: error.message, stack: error.stack }));
      }
    }
  } catch (error) {
    logger.error('Error in auto-replenishing credits', { error: error.message, stack: error.stack });
  }
}

module.exports = { checkAndTriggerAutoReplenish };