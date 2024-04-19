const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    logger.error(`Error hashing password: ${error.message}\n${error.stack}`);
    throw error;
  }
}

async function comparePassword(inputPassword, storedPassword) {
  try {
    return await bcrypt.compare(inputPassword, storedPassword);
  } catch (error) {
    logger.error(`Error comparing passwords: ${error.message}\n${error.stack}`);
    throw error;
  }
}

module.exports = {
  hashPassword,
  comparePassword,
};