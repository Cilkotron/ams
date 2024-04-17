const jwt = require('jsonwebtoken');
const User = require('../models/User');

const isAuthenticated = async (req, res, next) => {
  try {
    let token = req.cookies['jwt'];
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      const bearer = authHeader.split(' ')[0].toLowerCase();
      if (bearer === 'bearer') {
        token = authHeader.split(' ')[1];
      }
    }
    if (!token) {
      console.log('Access Denied: No token provided.');
      return res.status(401).send('Access Denied: No token provided.');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId); // Corrected from decoded.id to decoded.userId
    if (!user) {
      console.log('The user belonging to this token no longer exists.');
      return res.status(400).send('The user belonging to this token no longer exists.');
    }
    req.user = user;
    console.log(`User ${user.username} authenticated successfully.`);
    next();
  } catch (error) {
    console.error('Error verifying token:', error.message, error.stack);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = isAuthenticated;