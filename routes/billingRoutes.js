const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const isAuthenticated = require('../middleware/authMiddleware');
const User = require('../models/User');
const { createCharge } = require('../utils/stripeHelper');
const { fetchTransactionsForUser } = require('../utils/stripeTransactionsHelper');
const logger = require('../utils/logger');

// Function to ensure Stripe customer exists and return the ID
const ensureStripeCustomer = async (user) => {
  if (!user.stripeCustomerId) {
    // Create a Stripe customer if not found
    try {
      const stripeCustomer = await stripe.customers.create({
        email: user.email,
      });
      user.stripeCustomerId = stripeCustomer.id;
      await user.save();
      logger.info(`Stripe customer created and saved for user: ${user.email}`);
      return stripeCustomer.id;
    } catch (error) {
      logger.error('Failed to create Stripe customer: %s', error.message, { stack: error.stack });
      throw error;
    }
  }
  return user.stripeCustomerId;
};

router.get('/billing', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      logger.error(`User not found with ID: ${req.user._id}`);
      return res.status(404).send('User not found');
    }
    const stripeCustomerId = await ensureStripeCustomer(user);
    const transactions = await fetchTransactionsForUser(stripeCustomerId);
    logger.info(`Fetched transactions for user: ${user._id}. Number of transactions: ${transactions.length}`);
    const appName = process.env.APP_NAME || 'Account Management App';
    res.render('billing', { transactions: transactions, user: user, appName: appName });
  } catch (error) {
    logger.error('Failed to fetch billing info: %s', error.message, { stack: error.stack });
    res.status(500).send('Server Error');
  }
});

router.post('/billing/auto-replenish', isAuthenticated, async (req, res) => {
  const { autoReplenish, autoReplenishCredits, autoReplenishThreshold } = req.body;
  const autoReplenishBool = autoReplenish === 'on' ? true : false; // Convert autoReplenish to boolean
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      logger.error("Unauthorized attempt to update auto-replenish settings.");
      return res.status(401).send('Unauthorized: Please log in to update settings.');
    }
    await User.findByIdAndUpdate(req.user._id, {
      autoReplenish: autoReplenishBool,
      autoReplenishCredits,
      autoReplenishThreshold
    });
    logger.info(`Auto-replenish settings updated for user: ${req.user._id}. Auto-replenish: ${autoReplenishBool}, Credits: ${autoReplenishCredits}, Threshold: ${autoReplenishThreshold}`);
    res.redirect('/billing');
  } catch (error) {
    logger.error('Failed to update auto-replenish settings: %s', error.message, { stack: error.stack });
    res.status(500).send('Server Error');
  }
});

router.get('/billing/invoices', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      logger.error(`User not found with ID: ${req.user._id}`);
      return res.status(404).send('User not found');
    }
    const stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      logger.error('Stripe customer ID not found for user:', user.email);
      return res.status(404).send('Stripe customer ID not found');
    }
    const transactions = await fetchTransactionsForUser(stripeCustomerId);
    logger.info(`Fetched transactions for user: ${req.user._id}. Number of transactions: ${transactions.length}`);
    res.json(transactions);
  } catch (error) {
    logger.error('Failed to retrieve invoices: %s', error.message, { stack: error.stack });
    res.status(500).send('Server Error');
  }
});

module.exports = router;