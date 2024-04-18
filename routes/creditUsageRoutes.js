const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const User = require('../models/User'); // Ensure User model is imported for database operations
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Import Stripe to handle charges
const isAuthenticated = require('../middleware/authMiddleware');

// Middleware to authenticate the request from the web scraping microservice
const authenticateMicroserviceRequest = (req, res, next) => {
    const secretKey = req.headers['x-secret-key'];
    if (secretKey === process.env.MICROSERVICE_SECRET_KEY) {
        next();
    } else {
        logger.error('Failed microservice authentication attempt');
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

router.post('/update-credits', authenticateMicroserviceRequest, async (req, res) => {
    const { userId, creditsUsed } = req.body;
    if (!userId || !creditsUsed) {
        logger.error('Missing userId or creditsUsed in request body');
        return res.status(400).json({ message: 'userId and creditsUsed are required' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            logger.error(`User not found with ID: ${userId}`);
            return res.status(404).json({ message: 'User not found' });
        }

        // Ensure creditsUsed is a positive number
        const creditsToUse = parseInt(creditsUsed, 10);
        if (isNaN(creditsToUse) || creditsToUse < 0) {
            logger.error('Invalid creditsUsed value. It must be a positive number.');
            return res.status(400).json({ message: 'Invalid creditsUsed value. It must be a positive number.' });
        }

        user.credits -= creditsToUse;
        await user.save();
        logger.info(`Credits updated for user ${userId}. Credits used: ${creditsToUse}`);
        res.json({ message: 'Credits updated successfully', newCredits: user.credits });
    } catch (error) {
        logger.error('Error updating user credits', { error: error.message, stack: error.stack });
        res.status(500).json({ message: 'Error updating user credits', error: error.message });
    }
});

// Route to handle decreasing credits
router.post('/decrease-credits', isAuthenticated, async (req, res) => {
    const userId = req.user._id; // Assuming req.user is populated by authentication middleware
    const { amount } = req.body; // Amount of credits to decrease
    if (!userId) {
        logger.error('Authentication failed. User ID not found.');
        return res.status(401).json({ message: 'Unauthorized: User not authenticated.' });
    }
    if (!amount) {
        logger.error('Amount to decrease not provided.');
        return res.status(400).json({ message: 'Amount to decrease is required.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            logger.error(`User not found with ID: ${userId}`);
            return res.status(404).json({ message: 'User not found' });
        }

        const decreaseAmount = parseInt(amount, 10);
        if (isNaN(decreaseAmount) || decreaseAmount <= 0) {
            logger.error('Invalid amount provided. It must be a positive number.');
            return res.status(400).json({ message: 'Invalid amount. It must be a positive number.' });
        }

        if (user.credits < decreaseAmount) {
            logger.error(`User ${userId} does not have enough credits to decrease.`);
            return res.status(400).json({ message: 'Not enough credits to decrease.' });
        }

        user.credits -= decreaseAmount;
        await user.save();
        logger.info(`Decreased ${decreaseAmount} credits for user ${userId}. New balance: ${user.credits}`);

        // Check for auto-replenish settings and trigger Stripe charge if necessary
        if (user.autoReplenish && user.credits < user.autoReplenishThreshold) {
            const chargeAmount = user.autoReplenishCredits; // Amount to replenish
            try {
                const charge = await stripe.charges.create({
                    amount: chargeAmount * 100, // Stripe requires amount in cents
                    currency: 'usd',
                    customer: user.stripeCustomerId,
                    description: `Auto-replenish for ${chargeAmount} credits`,
                });
                user.credits += chargeAmount;
                await user.save();
                logger.info(`Auto-replenished ${chargeAmount} credits for user ${userId}. New balance: ${user.credits}`);
            } catch (stripeError) {
                logger.error('Stripe charge for auto-replenish failed', { error: stripeError.message, stack: stripeError.stack });
                return res.status(500).json({ message: 'Stripe charge for auto-replenish failed', error: stripeError.message });
            }
        }

        res.json({ message: 'Credits decreased successfully', newCredits: user.credits });
    } catch (error) {
        logger.error('Error decreasing credits', { error: error.message, stack: error.stack });
        res.status(500).json({ message: 'Error decreasing credits', error: error.message });
    }
});

module.exports = router;