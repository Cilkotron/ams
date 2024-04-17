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
    if (!req.session || !req.session.userId) {
      logger.error("Unauthorized access attempt to billing information.");
      return res.status(401).send('Unauthorized: Please log in to access billing information.');
    }
    const user = await User.findById(req.session.userId);
    if (!user) {
      logger.error(`User not found with ID: ${req.session.userId}`);
      return res.status(404).send('User not found');
    }
    const stripeCustomerId = await ensureStripeCustomer(user);
    const transactions = await fetchTransactionsForUser(stripeCustomerId);
    logger.info(`Fetched transactions for user: ${req.session.userId}. Number of transactions: ${transactions.length}`);
    const appName = process.env.APP_NAME || 'Account Management App';
    res.render('billing', { transactions: transactions, user: user, appName: appName });
  } catch (error) {
    logger.error('Failed to fetch billing info: %s', error.message, { stack: error.stack });
    res.status(500).send('Server Error');
  }
});

router.post('/billing/auto-replenish', isAuthenticated, async (req, res) => {
  const { autoReplenish, autoReplenishCredits, autoReplenishThreshold } = req.body;
  try {
    if (!req.session || !req.session.userId) {
      logger.error("Unauthorized attempt to update auto-replenish settings.");
      return res.status(401).send('Unauthorized: Please log in to update settings.');
    }
    await User.findByIdAndUpdate(req.session.userId, {
      autoReplenish,
      autoReplenishCredits,
      autoReplenishThreshold
    });
    logger.info(`Auto-replenish settings updated for user: ${req.session.userId}. Auto-replenish: ${autoReplenish}, Credits: ${autoReplenishCredits}, Threshold: ${autoReplenishThreshold}`);
    res.redirect('/billing');
  } catch (error) {
    logger.error('Failed to update auto-replenish settings: %s', error.message, { stack: error.stack });
    res.status(500).send('Server Error');
  }
});

router.get('/billing/invoices', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      logger.error(`User not found with ID: ${req.session.userId}`);
      return res.status(404).send('User not found');
    }
    const stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      logger.error('Stripe customer ID not found for user:', user.email);
      return res.status(404).send('Stripe customer ID not found');
    }
    const transactions = await fetchTransactionsForUser(stripeCustomerId);
    logger.info(`Fetched transactions for user: ${req.session.userId}. Number of transactions: ${transactions.length}`);
    res.json(transactions);
  } catch (error) {
    logger.error('Failed to retrieve invoices: %s', error.message, { stack: error.stack });
    res.status(500).send('Server Error');
  }
});

module.exports = router;