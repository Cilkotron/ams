const jwt = require('jsonwebtoken');
const logger = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET; 

const generateToken = (userId, expiresIn = '365d') => {
  try {
    const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn });
    logger.info('JWT token generated successfully for user ID: ' + userId);
    return token;
  } catch (error) {
    logger.error('Error generating JWT token', { error: error.message, stack: error.stack });
    throw error;
  }
};

const verifyAndRefreshToken = (token, res) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    logger.info('JWT token verified successfully for user ID: ' + decoded.id);

    // Check if token is older than 364 days
    const tokenAgeInDays = (Date.now() / 1000 - decoded.iat) / (60 * 60 * 24);
    if (tokenAgeInDays >= 364) {
      const newToken = generateToken(decoded.id, '365d');
      res.cookie('jwt', newToken, { httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000 });
      logger.info('JWT token refreshed for user ID: ' + decoded.id);
    }

    return decoded;
  } catch (error) {
    logger.error('Error verifying JWT token', { error: error.message, stack: error.stack });
    throw error;
  }
};

module.exports = {
  generateToken,
  verifyAndRefreshToken,
};