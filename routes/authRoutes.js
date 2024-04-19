const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const stripeHelper = require('../utils/stripeHelper');
const logger = require('../utils/logger');
const router = express.Router();
const passwordUtils = require('../utils/passwordUtils');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { sendEmail } = require('../utils/emailSender'); // Ensure emailSender is imported to use for sending emails

router.get('/auth/register', (req, res) => {
  res.render('register', { appName: process.env.APP_NAME });
});

router.post('/auth/register', async (req, res) => {
  try {
    const { password, email } = req.body;
    if (!password || password.trim() === '') {
      logger.error('Registration error: Password cannot be empty');
      return res.status(400).send('Password cannot be empty');
    }
    if (!email || !email.trim() || !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      logger.error('Registration error: Invalid or empty email');
      return res.status(400).send('Invalid or empty email');
    }
    const existingUser = await User.findOne({ email: { $regex: new RegExp("^" + email.trim() + "$", "i") } });
    if (existingUser) {
      logger.error('Registration error: Email already in use');
      return res.status(400).send('Email already in use');
    }
    const hashedPassword = await passwordUtils.hashPassword(password.trim());
    const newUser = await User.create({ email: email.toLowerCase().trim(), password: hashedPassword, isAdmin: req.body.isAdmin || false });
    logger.info(`User registered successfully: ${newUser.email}`);
    const token = jwt.sign({ id: newUser._id, isAdmin: newUser.isAdmin }, process.env.JWT_SECRET.trim(), { expiresIn: '365d' });
    res.cookie('jwt', token, { httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000 });
    logger.info(`JWT token generated and stored in cookie for user ${newUser.email}`);
    res.redirect('/');
  } catch (error) {
    logger.error(`Registration error: ${error.message} - ${error.stack}`);
    res.status(500).send(error.message);
  }
});

router.get('/auth/login', (req, res) => {
  const messages = req.flash();
  const successMessages = messages.success ? messages.success : [];
  const errorMessages = messages.error ? messages.error : [];
  res.render('login', { appName: process.env.APP_NAME, messages: { success: successMessages, error: errorMessages } });
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || email.trim() === '') {
      logger.error('Login error: Email cannot be empty');
      return res.status(400).send('Email cannot be empty');
    }
    const user = await User.findOne({ email: { $regex: new RegExp("^" + email.trim() + "$", "i") } });
    if (!user) {
      logger.error(`User not found for email: ${email}`);
      return res.status(400).send('User not found');
    }
    const isMatch = await passwordUtils.comparePassword(password.trim(), user.password);
    if (isMatch) {
      const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET.trim(), { expiresIn: '365d' });
      res.cookie('jwt', token, { httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000, path: '/' });
      logger.info(`User ${user.email} logged in successfully`);
      return res.redirect('/');
    } else {
      logger.error(`Password is incorrect for email: ${email}`);
      return res.status(400).send('Password is incorrect. Please check your password and try again.');
    }
  } catch (error) {
    logger.error(`Login error: ${error.message} - ${error.stack}`);
    return res.status(500).send(error.message);
  }
});

router.get('/auth/logout', (req, res) => {
  res.clearCookie('jwt', { path: '/' });
  req.session.destroy((err) => {
    if (err) {
      logger.error(`Session destruction error: ${err.message} - ${err.stack}`);
      return res.status(500).send('Error logging out');
    }
    logger.info('User logged out successfully');
    res.redirect('/auth/login');
  });
});

router.get('/auth/request-password-reset', (req, res) => {
  res.render('passwordResetRequest', { appName: process.env.APP_NAME, messages: req.flash() });
});

router.post('/auth/request-password-reset', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    logger.error('Password reset error: User not found');
    return res.status(400).send('User not found.');
  }

  const resetPasswordToken = crypto.randomBytes(20).toString('hex');
  const resetPasswordExpires = Date.now() + 600000; // 10 minutes

  user.resetPasswordToken = resetPasswordToken;
  user.resetPasswordExpires = resetPasswordExpires;
  await user.save();

  const resetPasswordUrl = `http://${req.headers.host}/auth/password-reset-form?token=${resetPasswordToken}`;
  const emailBody = `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
        `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
        `${resetPasswordUrl}\n\n` +
        `If you did not request this, please ignore this email and your password will remain unchanged.\n`;

  await sendEmail(user.email, 'Password Reset Request', emailBody)
    .then(() => {
      req.flash('success', 'An e-mail has been sent with further instructions.');
      res.redirect('/auth/login');
    })
    .catch(error => {
      logger.error('Failed to send password reset email: %s\n%s', error.message, error.stack);
      res.status(500).send('Email could not be sent.');
    });
});

router.get('/auth/password-reset-form', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(400).send('Invalid request. Token is missing.');
  }
  res.render('passwordResetForm', { token: token, appName: process.env.APP_NAME });
});

router.post('/auth/reset-password', async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    logger.error('Password reset error: Passwords do not match');
    return res.status(400).send('Passwords do not match.');
  }
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    logger.error('Password reset error: Token is invalid or has expired');
    return res.status(400).send('Password reset token is invalid or has expired.');
  }

  user.password = await bcrypt.hash(password, 8);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  logger.info('Password has been updated successfully');
  req.flash('success', 'Your password has been updated successfully. Please log in.');
  res.redirect('/auth/login');
});

module.exports = router;