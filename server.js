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
const passwordResetRoutes = require('./routes/passwordResetRoutes'); // Import password reset routes
const cookieParser = require('cookie-parser'); // Added for JWT cookie handling
const cors = require('cors'); // Added for CORS support

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET || !process.env.JWT_SECRET || !process.env.STRIPE_SECRET_KEY || !process.env.APP_NAME || !process.env.STRIPE_SUCCESS_URL || !process.env.STRIPE_CANCEL_URL) { // Check for necessary environment variables
  console.error("Error: config environment variables not set. Please create/edit .env configuration file.");
  process.exit(-1);
}

const app = express();
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

app.on("error", (error) => {
  console.error(`Server error: ${error.message}`);
  console.error(error.stack);
});

// Logging session creation and destruction
app.use((req, res, next) => {
  const sess = req.session;
  // Make session available to all views
  res.locals.session = sess;
  res.locals.success = req.flash('success'); // Make flash messages available to all views
  if (!sess.views) {
    sess.views = 1;
    console.log("Session created at: ", new Date().toISOString());
  } else {
    sess.views++;
    console.log(
      `Session accessed again at: ${new Date().toISOString()}, Views: ${sess.views}, User ID: ${sess.userId || '(unauthenticated)'}`,
    );
  }
  next();
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
app.use('/api', creditUsageRoutes); // Registering the credit usage update routes

// Password Reset Routes
app.use('/auth', passwordResetRoutes); // Adjusted to mount password reset routes under '/auth'

// Root path response
app.get("/", (req, res) => {
  res.render("index", { appName: process.env.APP_NAME });
});

// If no routes handled the request, it's a 404
app.use((req, res, next) => {
  res.status(404).send("Page not found.");
});

// Error handling
app.use((err, req, res, next) => {
  console.error(`Unhandled application error: ${err.message}`);
  console.error(err.stack);
  res.status(500).send("There was an error serving your request.");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});