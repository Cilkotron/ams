const express = require('express');
const router = express.Router();

router.get('/contact', (req, res) => {
    console.log("Rendering the contact page.");
    try {
        res.render('contact', { email: 'support@accountmanagementapp.com', appName: process.env.APP_NAME });
    } catch (error) {
        console.error("Error rendering the contact page:", error.message, error.stack);
        res.status(500).send("An error occurred while rendering the contact page.");
    }
});

module.exports = router;