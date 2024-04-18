const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs'); // Using bcryptjs for compatibility
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
    if (!password || password.trim() === '') {
      logger.error('Registration error: Password cannot be empty');
      return res.status(400).send('Password cannot be empty');
    }
    const saltRounds = 10; // Ensure salt rounds are consistent
    const hashedPassword = await bcrypt.hash(password.trim(), saltRounds); // Hash password with bcryptjs
    const newUser = await User.create({ username: username.toLowerCase().trim(), password: hashedPassword, email: email.toLowerCase().trim() }); // Use hashed password and store username as provided in lowercase
    logger.info(`User registered successfully: ${newUser.username}`);
    // Generate JWT token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET.trim(), { expiresIn: '365d' }); // Token expires in 1 year, corrected payload key to 'id'
    // Store token in HTTP-only cookie
    res.cookie('jwt', token, { httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000 }); // Cookie expires in 1 year
    logger.info(`JWT token generated and stored in cookie for user ${newUser.username}`);
    res.redirect('/auth/login');
  } catch (error) {
    logger.error('Registration error: %s - %s', error.message, error.stack);
    res.status(500).send(error.message);
  }
});

router.get('/auth/login', (req, res) => {
  res.render('login', { appName: process.env.APP_NAME });
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || email.trim() === '') {
      logger.error('Login error: Email cannot be empty');
      return res.status(400).send('Email cannot be empty');
    }
    // Updated to use case-insensitive query for email
    const user = await User.findOne({ email: { $regex: new RegExp("^" + email.trim() + "$", "i") } });
    if (!user) {
      logger.error('User not found for email: %s', email);
      return res.status(400).send('User not found');
    }
    const isMatch = await bcrypt.compare(password.trim(), user.password); // Use bcryptjs for password comparison
    if (isMatch) {
      // Generate JWT token
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET.trim(), { expiresIn: '365d' }); // Token expires in 1 year, ensure JWT_SECRET is trimmed
      // Store token in HTTP-only cookie
      res.cookie('jwt', token, { httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000, path: '/' }); // Cookie expires in 1 year, specify path
      logger.info(`User ${user.email} logged in successfully`);
      return res.redirect('/');
    } else {
      logger.error('Password is incorrect for email: %s', email);
      return res.status(400).send('Password is incorrect. Please check your password and try again.');
    }
  } catch (error) {
    logger.error('Login error: %s - %s', error.message, error.stack);
    return res.status(500).send(error.message);
  }
});

router.get('/auth/logout', (req, res) => {
  // Clear the token cookie
  res.clearCookie('jwt', { path: '/' }); // Specify path for cookie clearing
  req.session.destroy((err) => {
    if (err) {
      logger.error('Session destruction error: %s - %s', err.message, err.stack);
      return res.status(500).send('Error logging out');
    }
    logger.info('User logged out successfully');
    res.redirect('/auth/login');
  });
});

module.exports = router;