const express = require('express');
const User = require('../models/User');
const isAuthenticated = require('../middleware/authMiddleware'); // Corrected the path for importing isAuthenticated middleware
const router = express.Router();

router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id); // Corrected from req.userId to req.user._id based on the middleware's user attachment
    if (!user) {
      console.error('User not found for ID:', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }
    const creditsUsed = {
      lastDay: calculateCreditsUsed(user, 1),
      lastWeek: calculateCreditsUsed(user, 7),
      lastMonth: calculateCreditsUsed(user, 30),
    };
    res.render('dashboard', { appName: process.env.APP_NAME, user: user, creditsUsed: creditsUsed });
  } catch (error) {
    console.error('Dashboard error:', error.message, { trace: error.stack });
    res.status(500).send('Internal server error');
  }
});

router.get('/dashboard/data', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id, 'apiKey credits'); // Corrected from req.userId to req.user._id based on the middleware's user attachment
    if (!user) {
      console.error('User not found for ID:', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }
    const creditsUsed = {
      lastDay: calculateCreditsUsed(user, 1),
      lastWeek: calculateCreditsUsed(user, 7),
      lastMonth: calculateCreditsUsed(user, 30),
    };
    res.json({ user: user, creditsUsed: creditsUsed });
  } catch (error) {
    console.error('Error fetching dashboard data:', error.message, { trace: error.stack });
    res.status(500).json({ message: 'Internal server error' });
  }
});

function calculateCreditsUsed(user, daysBack) {
  // This is a placeholder implementation. Replace with actual logic to calculate credits used based on user's activity.
  console.log(`Calculating credits used for the last ${daysBack} days for user ${user.username}`);
  // Placeholder logic for demonstration purposes
  let creditsUsed = 0;
  switch (daysBack) {
    case 1:
      creditsUsed = 100; // Placeholder value
      break;
    case 7:
      creditsUsed = 700; // Placeholder value
      break;
    case 30:
      creditsUsed = 3000; // Placeholder value
      break;
    default:
      creditsUsed = 0;
  }
  return creditsUsed;
}

module.exports = router;