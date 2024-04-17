const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); 
const logger = require('../utils/logger'); // Ensure logger is required to log messages

const fetchTransactionsForUser = async (stripeCustomerId) => {
  try {
    const charges = await stripe.charges.list({
      customer: stripeCustomerId,
    });

    // Initialize an empty array to hold unique transactions
    let uniqueTransactions = [];

    charges.data.forEach(charge => {
      // Check if the transaction is already in the uniqueTransactions array
      if (!uniqueTransactions.some(uniqueCharge => uniqueCharge.id === charge.id)) {
        uniqueTransactions.push({
          id: charge.id,
          amount: charge.amount,
          currency: charge.currency,
          description: charge.description,
          created: charge.created,
          receipt_url: charge.receipt_url // Added receipt_url to the transaction details
        });
      }
    });

    logger.info(`Successfully fetched transactions for customer ID: ${stripeCustomerId}. Unique transactions count: ${uniqueTransactions.length}`);
    return uniqueTransactions;
  } catch (error) {
    logger.error('Error fetching transactions from Stripe', { error: error.message, stack: error.stack });
    throw new Error(`Failed to fetch transactions for customer ID: ${stripeCustomerId}. Error: ${error.message}`);
  }
};

module.exports = {
  fetchTransactionsForUser,
};