const User = require('../models/User');
const logger = require('../utils/logger');

const updateLastActivity = async (req, res, next) => {
  if (req.isAuthenticated) {
    try {
      await User.findByIdAndUpdate(req.user._id, { lastActivity: Date.now() });
      logger.info(`Updated last activity for user ${req.user._id}`);
    } catch (error) {
      logger.error(`Error updating last activity for user ${req.user._id}: ${error.message}`, { error: error.stack });
    }
  }
  next();
};

module.exports = updateLastActivity;