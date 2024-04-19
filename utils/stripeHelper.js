const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const mongoose = require('mongoose');
const logger = require('../utils/logger'); // Assuming logger is implemented in utils/logger.js

const calculateCost = (credits) => {
  if (credits <= 5000) return 0;
  if (credits <= 505000) return (credits - 5000) * 0.0018;
  return ((credits - 505000) * 0.0009) + 900;
};

const createStripeCustomer = async (email) => {
  try {
    const customer = await stripe.customers.create({ email });
    logger.info(`Stripe customer created with ID: ${customer.id}`);
    return customer.id;
  } catch (error) {
    logger.error('Error creating Stripe customer:', error.message, error.stack);
    throw error;
  }
};

const createCharge = async (userId, credits) => {
  try {
    const user = await User.findById(userId);
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      // Attempt to create a Stripe customer if not found
      const email = user.username; // Use username as email for Stripe customer creation
      stripeCustomerId = await createStripeCustomer(email);
      user.stripeCustomerId = stripeCustomerId; // Save the Stripe customer ID to the user
      await user.save();
      logger.info(`Stripe customer ID created and saved for user: ${userId}`);
    }
    const amount = calculateCost(credits);
    const charge = await stripe.charges.create({
      amount: Math.round(amount * 100), // Convert amount to cents
      currency: 'usd',
      customer: stripeCustomerId,
    });
    logger.info(`Stripe charge created: ${charge.id} for user ${userId}`);
    return charge;
  } catch (error) {
    logger.error('Error creating Stripe charge:', error.message, error.stack);
    throw error;
  }
};

const fetchInvoices = async (stripeCustomerId) => {
  try {
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 100, // Adjust the limit as needed, or implement pagination for large sets of invoices
    });
    logger.info(`Fetched ${invoices.data.length} invoices for customer ID: ${stripeCustomerId}`);
    if (invoices.data.length === 0) {
      logger.info(`No invoices found for customer ID: ${stripeCustomerId}. Ensure transactions have been completed.`);
    }
    return invoices.data;
  } catch (error) {
    logger.error('Error fetching Stripe invoices:', error.message, error.stack);
    throw error;
  }
};

const createCustomInvoice = async (userId, amountInUSD) => {
  try {
    const user = await User.findById(userId);
    if (!user.stripeCustomerId) {
      logger.error(`Stripe customer ID not found for user ${userId}.`);
      throw new Error('Stripe customer ID not found for user.');
    }
    // Ensure amount is greater than zero before creating an invoice
    if (amountInUSD <= 0) {
      logger.error(`Attempted to create an invoice with invalid amount: ${amountInUSD} USD for user ${userId}.`);
      throw new Error('Invalid amount for invoice creation.');
    }
    const amount = amountInUSD * 100; // Convert dollars to cents for Stripe API
    const invoiceItem = await stripe.invoiceItems.create({
      customer: user.stripeCustomerId,
      amount: amount,
      currency: 'usd',
      description: 'Custom Invoice Charge',
    });
    const invoice = await stripe.invoices.create({
      customer: user.stripeCustomerId,
      auto_advance: true, // Automatically finalize and pay the invoice
      collection_method: "charge_automatically",
    });
    logger.info(`Custom invoice created: ${invoice.id} for user ${userId} with amount ${amountInUSD} USD.`);
    return invoice;
  } catch (error) {
    logger.error('Error creating custom invoice:', error.message, error.stack);
    throw error;
  }
};

const refundInvoice = async (invoiceId) => {
  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    if (!invoice.paid) {
      logger.error(`Attempted to refund an unpaid invoice: ${invoiceId}. Only paid invoices can be refunded.`);
      throw new Error('Attempted to refund an unpaid invoice. Only paid invoices can be refunded.');
    }
    const charge = invoice.charge;
    if (!charge) {
      logger.error(`No charge associated with the paid invoice ${invoiceId}.`);
      throw new Error('No charge associated with the paid invoice.');
    }
    const refund = await stripe.refunds.create({
      charge: charge,
    });
    logger.info(`Refund created for invoice: ${invoiceId} with refund ID: ${refund.id}`);
    return refund;
  } catch (error) {
    logger.error('Error refunding invoice:', error.message, error.stack);
    throw error;
  }
};

module.exports = { createStripeCustomer, createCharge, calculateCost, fetchInvoices, createCustomInvoice, refundInvoice };