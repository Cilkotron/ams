const express = require('express');
const router = express.Router();
const User = require('../models/User');
const isAuthenticated = require('../middleware/authMiddleware');

// Route to fetch and display the API Info page
router.get('/api-info', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id); // Corrected from req.session.userId to req.user._id based on the middleware's user attachment
        if (!user) {
            console.error('User not found for ID:', req.user._id);
            return res.status(404).send('User not found');
        }
        console.log('Displaying API info for user:', req.user._id);
        res.render('apiInfo', { user: user, appName: process.env.APP_NAME }); // Changed to pass the entire user object to the view
    } catch (error) {
        console.error('Failed to fetch API info:', error.message, { trace: error.stack });
        res.status(500).send('Server error');
    }
});

module.exports = router;