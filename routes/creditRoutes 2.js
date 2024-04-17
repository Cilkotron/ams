const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const isAuthenticated = require('../middleware/authMiddleware');
const User = require('../models/User');
const { calculateCost } = require('../utils/stripeHelper');
const logger = require('../utils/logger');

// Display the Buy Credits form
router.get('/buy-credits', isAuthenticated, (req, res) => {
  res.render('buyCredits', { appName: process.env.APP_NAME });
});

// Calculate price and initiate Stripe payment
router.post('/purchase-credits', isAuthenticated, async (req, res) => {
  const { credits } = req.body;
  const cost = calculateCost(parseInt(credits));
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
      logger.info(`Stripe customer created and saved for user: ${user.username}`);
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
      metadata: { credits: credits } // Store credits in metadata for retrieval after purchase
    });
    logger.info(`Stripe checkout session created: ${session.id}`);
    res.json({ url: session.url });
  } catch (error) {
    logger.error('Error creating Stripe checkout session:', error.message, error.stack);
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
    logger.info(`User ${user.username} successfully bought ${creditsPurchased} credits. Total credits now: ${user.credits}`);
    // Directly render the success page with updated user information
    res.render('success', { user: user, appName: process.env.APP_NAME || 'Account Management App' }); // Ensure appName is passed to the success template
  } catch (error) {
    logger.error('Error retrieving Stripe session in success route:', error.message, error.stack);
    res.status(500).send('Error processing your request');
  }
});

module.exports = router;