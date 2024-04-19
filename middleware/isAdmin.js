const jwt = require('jsonwebtoken');

const isAdmin = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies['jwt']) {
        token = req.cookies['jwt'];
    }

    if (!token) {
        console.log("No JWT token found.");
        return res.status(401).json({ message: "Unauthorized: No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET.trim());
        if (decoded.isAdmin) {
            console.log(`Admin access granted for user ID: ${decoded.id}`);
            req.user = decoded; // Set the user in the request
            next();
        } else {
            console.log(`Access denied. User ID: ${decoded.id} is not an admin.`);
            return res.status(403).json({ message: "Forbidden: User is not an admin." });
        }
    } catch (error) {
        console.error(`Error in isAdmin middleware: ${error.message}`);
        console.error(error.stack);
        return res.status(401).json({ message: "Unauthorized: Invalid token." });
    }
};

module.exports = isAdmin;