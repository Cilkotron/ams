const socketIO = require('socket.io');
const logger = require('./logger');

// This object will store user sockets by userId to target updates specifically
const userSockets = {};

function setupSocket(server) {
    const io = socketIO(server, {
        cors: {
            origin: process.env.FRONTEND_DOMAIN, // Set the correct origin for CORS policy
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        logger.info(`New WebSocket connection: ${socket.id}`);

        // Listen for a message from the client to register the user ID
        socket.on('register', (userId) => {
            logger.info(`Registering socket for user: ${userId}`);
            if (userId) {
                userSockets[userId] = socket;
            }
        });

        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
            // Remove the socket from userSockets when it disconnects
            Object.keys(userSockets).forEach(userId => {
                if (userSockets[userId] === socket) {
                    delete userSockets[userId];
                    logger.info(`Unregistered socket for user: ${userId}`);
                }
            });
        });
    });

    return io;
}

// Function to send credit update to a specific user
function sendCreditUpdate(userId, credits) {
    if (userSockets[userId]) {
        logger.info(`Sending credit update to user: ${userId}`);
        userSockets[userId].emit('creditUpdate', { credits });
    } else {
        logger.error(`No socket found for user: ${userId}`);
    }
}

module.exports = { setupSocket, sendCreditUpdate };