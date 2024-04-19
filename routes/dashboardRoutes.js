const express = require('express');
const User = require('../models/User');
const isAuthenticated = require('../middleware/authMiddleware');
const StripeCharge = require('../models/StripeCharge');
const moment = require('moment');
const router = express.Router();

router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      console.error('User not found for ID:', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }
    const creditsUsed = await calculateCreditsUsed(user._id);
    res.render('dashboard', { appName: process.env.APP_NAME, user: user, creditsUsed: creditsUsed });
  } catch (error) {
    console.error('Dashboard error:', error.message, { trace: error.stack });
    res.status(500).send('Internal server error');
  }
});

router.get('/dashboard/data', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id, 'apiKey credits');
    if (!user) {
      console.error('User not found for ID:', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }
    const creditsUsed = await calculateCreditsUsed(user._id);
    res.json({ user: user, creditsUsed: creditsUsed });
  } catch (error) {
    console.error('Error fetching dashboard data:', error.message, { trace: error.stack });
    res.status(500).json({ message: 'Internal server error' });
  }
});

async function calculateCreditsUsed(userId) {
  const today = moment().startOf('day');
  const lastDay = today.clone().subtract(1, 'days').toDate();
  const lastWeek = today.clone().subtract(7, 'days').toDate();
  const lastMonth = today.clone().subtract(30, 'days').toDate();

  const calculateSum = async (startDate) => {
    const charges = await StripeCharge.find({
      userId: userId,
      timestamp: { $gte: startDate }
    }).catch(error => {
      console.error('Error fetching Stripe charges:', error.message, { trace: error.stack });
      throw error;
    });
    return charges.reduce((sum, charge) => sum + charge.creditsUsed, 0);
  };

  return {
    lastDay: await calculateSum(lastDay),
    lastWeek: await calculateSum(lastWeek),
    lastMonth: await calculateSum(lastMonth),
  };
}

module.exports = router;