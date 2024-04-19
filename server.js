// Load environment variables
require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require('connect-flash'); // Added for flash message support
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require('./routes/dashboardRoutes'); // Added for dashboard functionality
const billingRoutes = require('./routes/billingRoutes'); // Import billing routes
const contactRoutes = require('./routes/contactRoutes'); // Import contact routes
const apiInfoRoutes = require('./routes/apiInfoRoutes'); // Import API Info routes
const creditRoutes = require('./routes/creditRoutes'); // Import credit purchase routes
const creditUsageRoutes = require('./routes/creditUsageRoutes'); // Import credit usage update routes
const adminRoutes = require('./routes/adminRoutes'); // Import admin routes
const cookieParser = require('cookie-parser'); // Added for JWT cookie handling
const cors = require('cors'); // Added for CORS support
const jwt = require('jsonwebtoken'); // Import jsonwebtoken for verifying JWT tokens
const cron = require('node-cron'); // Import node-cron for scheduling tasks
const { checkAndTriggerAutoReplenish } = require('./utils/autoReplenishCredits'); // Import the auto-replenish function
const http = require('http');
const { Server } = require("socket.io");
const updateLastActivityMiddleware = require('./middleware/updateLastActivityMiddleware'); // Import the middleware to update last activity
const { verifyAndRefreshToken } = require('./utils/jwtTokenHandler'); // Import the modified token handler
const User = require('./models/User'); // Import User model to fetch isAdmin status

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET || !process.env.JWT_SECRET || !process.env.STRIPE_SECRET_KEY || !process.env.APP_NAME || !process.env.STRIPE_SUCCESS_URL || !process.env.STRIPE_CANCEL_URL || !process.env.FRONTEND_DOMAIN || !process.env.MICROSERVICE_SECRET_KEY) { // Check for necessary environment variables
  console.error("Error: config environment variables not set. Please create/edit .env configuration file.");
  process.exit(-1);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_DOMAIN,
    methods: ["GET", "POST"]
  }
});
const port = process.env.PORT || 3000;

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware for handling cookies
app.use(cookieParser()); // Added cookie-parser middleware

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_DOMAIN, // Use environment variable for frontend domain
  credentials: true
}));

// Setting the templating engine to EJS
app.set("view engine", "ejs");

// Serve static files
app.use(express.static("public"));

// Database connection
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((err) => {
    console.error(`Database connection error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });

// Session configuration with connect-mongo
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE_URL }),
    cookie: { 
      secure: process.env.NODE_ENV === 'production', // Set secure flag based on environment
      httpOnly: true, 
      maxAge: 365 * 24 * 60 * 60 * 1000 // Cookie configuration for JWT
    }
  }),
);

// Initialize flash middleware
app.use(flash());

// Middleware to check authentication status and make it available to all views
app.use(async (req, res, next) => {
  const token = req.cookies['jwt'];
  if (token) {
    try {
      const decoded = verifyAndRefreshToken(token, res);
      const user = await User.findById(decoded.id);
      res.locals.isAuthenticated = true;
      res.locals.user = { id: decoded.id, isAdmin: user ? user.isAdmin : false };
      req.session.userId = decoded.id;
      console.log(`User ${decoded.id} authenticated successfully.`);
    } catch (error) {
      console.error(`JWT verification error: ${error.message}`);
      console.error(error.stack);
      res.locals.isAuthenticated = false;
    }
  } else {
    res.locals.isAuthenticated = false;
  }
  next();
});

// Apply the updateLastActivityMiddleware globally to all authenticated requests
app.use((req, res, next) => {
  if (res.locals.isAuthenticated) {
    updateLastActivityMiddleware(req, res, next);
  } else {
    next();
  }
});

// Authentication Routes
app.use(authRoutes);

// Dashboard Routes
app.use(dashboardRoutes); // Registering the dashboard routes

// Billing Routes
app.use(billingRoutes); // Registering the billing routes

// Contact Routes
app.use(contactRoutes); // Registering the contact routes

// API Info Routes
app.use(apiInfoRoutes); // Registering the API Info routes

// Credit Purchase Routes
app.use(creditRoutes); // Registering the credit purchase routes

// Credit Usage Update Routes
app.use(creditUsageRoutes); // Corrected to directly use creditUsageRoutes without '/api' prefix

// Admin Routes
app.use('/admin', adminRoutes); // Registering the admin routes

// Root path response
app.get("/", (req, res) => {
  res.render("index", { appName: process.env.APP_NAME, isAuthenticated: res.locals.isAuthenticated, isAdmin: res.locals.user ? res.locals.user.isAdmin : false });
});

// If no routes handled the request, it's a 404
app.use((req, res, next) => {
  res.status(404).send("Page not found.");
});

// Schedule the auto-replenish function to run every 10 seconds
cron.schedule('*/10 * * * * *', () => {
  checkAndTriggerAutoReplenish(io).catch(error => {
    console.error('Error in scheduled auto-replenish task:', error.message);
    console.error(error.stack);
  });
});

// WebSocket setup for real-time updates
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});