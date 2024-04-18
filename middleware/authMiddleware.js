const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger'); // Ensure logger is imported for detailed logging

const isAuthenticated = async (req, res, next) => {
  try {
    let token = req.cookies['jwt'];
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      const bearer = authHeader.split(' ')[0].toLowerCase();
      if (bearer === 'bearer') {
        token = authHeader.split(' ')[1].trim(); // Trim the token to remove any extraneous spaces
      }
    }
    if (!token) {
      logger.error('Access Denied: No token provided.');
      req.isAuthenticated = false; // Indicate that the user is not authenticated
      res.locals.isAuthenticated = false; // Ensure isAuthenticated is available in the EJS context
      next(); // Proceed without error to allow handling of non-protected routes
    } else {
      const decoded = jwt.verify(token, process.env.JWT_SECRET.trim()); // Trim the JWT_SECRET to remove any leading or trailing spaces
      const user = await User.findById(decoded.id);
      if (!user) {
        logger.error('The user belonging to this token no longer exists.');
        req.isAuthenticated = false; // Indicate that the user is not authenticated
        res.locals.isAuthenticated = false; // Ensure isAuthenticated is available in the EJS context
        next(); // Proceed without error to allow handling of non-protected routes
      } else {
        req.user = user;
        req.isAuthenticated = true; // Indicate that the user is authenticated
        res.locals.isAuthenticated = true; // Ensure isAuthenticated is available in the EJS context
        req.session.userId = user._id; // Store user ID in session for persistent login state
        logger.info(`User ${user.username} authenticated successfully.`);
        next();
      }
    }
  } catch (error) {
    logger.error('Error verifying token: %s', error.message, { error: error.stack });
    req.isAuthenticated = false; // Indicate that the user is not authenticated in case of token verification error
    res.locals.isAuthenticated = false; // Ensure isAuthenticated is available in the EJS context
    next(); // Proceed without error to allow handling of non-protected routes
  }
};

module.exports = isAuthenticated;