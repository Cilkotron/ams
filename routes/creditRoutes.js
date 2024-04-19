const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');
const isAuthenticated = require('../middleware/authMiddleware');
const User = require('../models/User');
const StripeCharge = require('../models/StripeCharge'); // Import StripeCharge model
const { calculateCost, calculateCredits } = require('../utils/stripeHelper');
const logger = require('../utils/logger');
const { sendEmail } = require('../utils/emailSender'); // Import email sender utility

// Display the Buy Credits form
router.get('/buy-credits', isAuthenticated, (req, res) => {
  res.render('buyCredits', { appName: process.env.APP_NAME });
});

// Calculate price and initiate Stripe payment
router.post('/purchase-credits', isAuthenticated, async (req, res) => {
  const { credits } = req.body;
  const cost = calculateCost(parseInt(credits));
  const creditsInt = parseInt(credits);
  logger.info(`Initiating purchase for ${credits} credits at cost ${cost}.`);
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      logger.error('User not found');
      return res.status(404).send('User not found');
    }
    if (!user.stripeCustomerId) {
      // Create a Stripe customer if not found
      if (!user.email) {
        logger.error('User email not found');
        return res.status(400).send('User email required for Stripe customer creation');
      }
      const stripeCustomer = await stripe.customers.create({
        email: user.email, // Use the user's email address
      });
      user.stripeCustomerId = stripeCustomer.id;
      await user.save();
      logger.info(`Stripe customer created and saved for user: ${user.email}`);
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Purchase ${credits} credits`,
          },
          unit_amount: Math.round(cost * 100), // Stripe expects the price in cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: process.env.STRIPE_CANCEL_URL, 
      customer: user.stripeCustomerId, // Use the existing Stripe customer ID
      metadata: { credits: creditsInt } // Store credits in metadata for retrieval after purchase
    });
    logger.info(`Stripe checkout session created: ${session.id}`);

    // Save Stripe charge details to the database
    const stripeCharge = new StripeCharge({
      userId: user._id,
      stripeChargeId: session.id, // Use session.id instead of session.payment_intent
      amount: cost,
      creditsUsed: creditsInt, // Save the number of credits purchased
      timestamp: new Date()
    });
    await stripeCharge.save().catch(error => {
      logger.error('Error saving Stripe charge details: %s\n%s', error.message, error.stack);
    });
    logger.info(`Stripe charge details saved for user: ${user.email}`);

    // Send email notification after successful purchase
    sendEmail(user.email, 'Credits Purchased Successfully', `You have successfully purchased ${creditsInt} credits. New balance: ${user.credits}.`)
      .catch(error => {
        // Log the error without treating it as a direct application error
        logger.debug('Email sending error: %s\n%s', error.message, error.stack);
      });

    res.json({ url: session.url });
  } catch (error) {
    logger.error('Error creating Stripe checkout session: %s\n%s', error.message, error.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Success route for Stripe purchase
router.get('/success', isAuthenticated, async (req, res) => {
  const session_id = req.query.session_id;
  if (!session_id) {
    logger.error('Session ID missing in success route');
    return res.status(400).send('Session ID is required');
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const user = await User.findById(req.user._id);
    if (!user) {
      logger.error('User not found during success route handling');
      return res.status(404).send('User not found');
    }
    const creditsPurchased = parseInt(session.metadata.credits); // Retrieve credits from session metadata
    user.credits += creditsPurchased; // Update user's credits
    await user.save();
    logger.info(`User ${user.email} successfully bought ${creditsPurchased} credits. Total credits now: ${user.credits}`);
    // Directly render the success page with updated user information
    res.render('success', { user: user, appName: process.env.APP_NAME || 'Account Management App' }); // Ensure appName is passed to the success template

    // Send email notification after successful purchase
    sendEmail(user.email, 'Credits Purchased Successfully', `You have successfully purchased ${creditsPurchased} credits. New balance: ${user.credits}.`)
      .catch(error => {
        logger.error('Email sending error after successful purchase: %s\n%s', error.message, error.stack);
      });
  } catch (error) {
    logger.error('Error retrieving Stripe session in success route: %s\n%s', error.message, error.stack);
    res.status(500).send('Error processing your request');
  }
});

// Stripe webhook endpoint for automatic credit replenishment
router.post('/webhooks/stripe', bodyParser.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Webhook Error: %s\n%s', err.message, err.stack);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the charge.succeeded event
  if (event.type === 'charge.succeeded') {
    const charge = event.data.object;
    const customerId = charge.customer;

    // Find the user by Stripe Customer ID and update their credits
    try {
      const user = await User.findOne({ stripeCustomerId: customerId });
      if (!user) {
        logger.error(`User not found for Stripe Customer ID: ${customerId}`);
        return res.status(404).send('User not found.');
      }

      // Assuming the credits are stored in metadata of the charge
      const creditsToAdd = parseInt(charge.metadata.credits);
      user.credits += creditsToAdd;
      await user.save();

      logger.info(`Credits updated for user ${user.email}. Total credits: ${user.credits}`);

      // Send email notification for auto-replenish trigger
      sendEmail(user.email, 'Auto-Replenish Triggered', `Your account has been auto-replenished with ${creditsToAdd} credits. New balance: ${user.credits}.`)
        .catch(error => {
          logger.error('Email sending error after auto-replenish: %s\n%s', error.message, error.stack);
        });
    } catch (error) {
      logger.error('Error updating user credits: %s\n%s', error.message, error.stack);
      return res.status(500).send('Internal Server Error');
    }
  }

  // Return a response to acknowledge receipt of the event
  res.json({received: true});
});

module.exports = router;