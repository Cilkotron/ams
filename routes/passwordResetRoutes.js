const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

router.get('/password-reset', (req, res) => {
    res.render('passwordReset', { appName: process.env.APP_NAME });
});

router.post('/password-reset', async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            logger.info(`Password reset attempt for non-existing email: ${email}`);
            return res.status(404).send('User not found');
        }
        // Ensure salt rounds match those used during user creation
        const saltRounds = 10; 
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        user.password = hashedPassword;
        await user.save();
        logger.info(`Password reset successfully for user: ${user.email}`);
        // Invalidate any existing sessions or tokens here if applicable
        // This might involve setting a flag in the user's session or database record
        // to force re-authentication on the next request
        // Note: The actual implementation of session or token invalidation will depend on your app's authentication flow
        res.redirect('/auth/login');
    } catch (error) {
        logger.error('Error resetting password', { error: error.message, stack: error.stack });
        res.status(500).send('Error resetting password');
    }
});

module.exports = router;