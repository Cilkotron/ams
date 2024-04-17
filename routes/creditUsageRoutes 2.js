const express = require('express');
const router = express.Router();
const User = require('../models/User');
const logger = require('../utils/logger');

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

        user.credits -= creditsUsed;
        await user.save();
        logger.info(`Credits updated for user ${userId}. Credits used: ${creditsUsed}`);
        res.json({ message: 'Credits updated successfully', newCredits: user.credits });
    } catch (error) {
        logger.error('Error updating user credits', { error: error.message, stack: error.stack });
        res.status(500).json({ message: 'Error updating user credits', error: error.message });
    }
});

module.exports = router;