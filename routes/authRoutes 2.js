const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const stripeHelper = require('../utils/stripeHelper'); // Import stripeHelper for Stripe customer creation
const logger = require('../utils/logger'); // Import logger for logging
const router = express.Router();

router.get('/auth/register', (req, res) => {
  res.render('register', { appName: process.env.APP_NAME });
});

router.post('/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const saltRounds = 10; // Ensure salt rounds are consistent
    const hashedPassword = await bcrypt.hash(password, saltRounds); // Hash password with bcrypt
    const newUser = await User.create({ username, password: hashedPassword, email }); // Use hashed password
    logger.info(`User registered successfully: ${newUser.username}`);
    // Generate JWT token
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '365d' }); // Token expires in 1 year
    // Store token in HTTP-only cookie
    res.cookie('jwt', token, { httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000 }); // Cookie expires in 1 year
    logger.info(`JWT token generated and stored in cookie for user ${newUser.username}`);
    res.redirect('/auth/login');
  } catch (error) {
    logger.error('Registration error: %s', error.message, { stack: error.stack });
    res.status(500).send(error.message);
  }
});

router.get('/auth/login', (req, res) => {
  res.render('login', { appName: process.env.APP_NAME });
});

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      logger.error('User not found');
      return res.status(400).send('User not found');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '365d' }); // Token expires in 1 year
      // Store token in HTTP-only cookie
      res.cookie('jwt', token, { httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000 }); // Cookie expires in 1 year
      logger.info(`User ${user.username} logged in successfully`);
      req.session.userId = user._id; // Set user ID in session
      return res.redirect('/');
    } else {
      logger.error('Password is incorrect for user: %s', username);
      return res.status(400).send('Password is incorrect');
    }
  } catch (error) {
    logger.error('Login error: %s', error.message, { stack: error.stack });
    return res.status(500).send(error.message);
  }
});

router.get('/auth/logout', (req, res) => {
  // Clear the token cookie
  res.clearCookie('jwt');
  req.session.destroy((err) => { // Destroy the session
    if (err) {
      logger.error('Session destruction error: %s', err.message, { stack: err.stack });
      return res.status(500).send('Error logging out');
    }
    logger.info('User logged out successfully');
    res.redirect('/auth/login');
  });
});

module.exports = router;