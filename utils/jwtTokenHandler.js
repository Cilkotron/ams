const jwt = require('jsonwebtoken');
const logger = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET;

const generateToken = (userId) => {
  try {
    const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '365d' }); // Token expires in 1 year
    logger.info('JWT token generated successfully');
    return token;
  } catch (error) {
    logger.error('Error generating JWT token', { error: error.message, stack: error.stack });
    throw error;
  }
};

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    logger.info('JWT token verified successfully');
    return decoded;
  } catch (error) {
    logger.error('Error verifying JWT token', { error: error.message, stack: error.stack });
    throw error;
  }
};

module.exports = {
  generateToken,
  verifyToken,
};