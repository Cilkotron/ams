const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const isAdmin = require('../middleware/isAdmin');
const { createCustomInvoice, refundInvoice } = require('../utils/stripeHelper'); // Import the refundInvoice function along with createCustomInvoice

// Admin dashboard route
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        // Fetch all users excluding admin users
        const users = await User.find({ isAdmin: { $ne: true } });
        res.render('admin/adminDashboard', { users, appName: process.env.APP_NAME });
    } catch (error) {
        console.error(`Admin dashboard error: ${error.message}`);
        console.error(error.stack);
        res.status(500).send('An error occurred accessing the admin dashboard');
    }
});

// Admin login route
router.get('/login', (req, res) => {
    res.render('admin/adminLogin', { appName: process.env.APP_NAME });
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const adminUser = await User.findOne({ email: email.toLowerCase().trim(), isAdmin: true });
        if (!adminUser) {
            console.error('Login error: Admin not found');
            return res.status(401).send('Admin not found');
        }
        const isMatch = await bcrypt.compare(password, adminUser.password);
        if (!isMatch) {
            console.error('Login error: Invalid password');
            return res.status(401).send('Invalid password');
        }
        const token = jwt.sign({ id: adminUser._id, isAdmin: adminUser.isAdmin }, process.env.JWT_SECRET.trim(), { expiresIn: '365d' });
        res.cookie('jwt', token, { httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000 });
        console.log(`Admin ${adminUser.email} logged in successfully`);
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error(`Admin login error: ${error.message}`);
        console.error(error.stack);
        res.status(500).send('An error occurred during admin login');
    }
});

// Consolidated registration route for both users and admins
router.get('/register', (req, res) => {
    res.render('admin/adminRegister', { appName: process.env.APP_NAME });
});

router.post('/register', async (req, res) => {
    try {
        const { email, password, isAdmin } = req.body;
        if (!email || !password) {
            throw new Error('Email and password are required');
        }
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            throw new Error('Email is already in use');
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await User.create({
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            isAdmin: isAdmin === 'true'
        });
        const token = jwt.sign({ id: newUser._id, isAdmin: newUser.isAdmin }, process.env.JWT_SECRET.trim(), { expiresIn: '365d' });
        res.cookie('jwt', token, { httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000 });
        console.log(`User registered successfully: ${newUser.email}`);
        if (newUser.isAdmin) {
            console.log(`Admin registered successfully: ${newUser.email}`);
            res.redirect('/admin/dashboard');
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.error(`Registration error: ${error.message}`);
        console.error(error.stack);
        res.status(500).send(error.message);
    }
});

// Route for creating custom invoices
router.post('/create-invoice', isAdmin, async (req, res) => {
    try {
        const { userId, amountInUSD } = req.body;
        if (typeof amountInUSD !== 'number' || amountInUSD <= 0) {
            console.error('Invalid amountInUSD value');
            return res.status(400).send('Invalid amount specified for invoice creation.');
        }
        const invoice = await createCustomInvoice(userId, amountInUSD);
        console.log(`Custom invoice created successfully for user ${userId} with amount ${amountInUSD} USD.`);
        res.json(invoice);
    } catch (error) {
        console.error(`Error creating custom invoice: ${error.message}`);
        console.error(error.stack);
        res.status(500).send('An error occurred while creating a custom invoice');
    }
});

// Route for refunding invoices
router.post('/refund-invoice', isAdmin, async (req, res) => {
    try {
        const { invoiceId } = req.body;
        const refund = await refundInvoice(invoiceId);
        console.log(`Invoice ${invoiceId} refunded successfully`);
        res.json(refund);
    } catch (error) {
        console.error(`Error refunding invoice: ${error.message}`);
        console.error(error.stack);
        res.status(500).send('An error occurred while refunding the invoice');
    }
});

// New route for managing a specific user by admin
router.get('/user/:userId', isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('email credits isAdmin');
        if (!user) {
            console.error('User not found');
            return res.status(404).send('User not found');
        }
        res.render('admin/manageUser', { user, appName: process.env.APP_NAME }); // Added appName to the render method
    } catch (error) {
        console.error(`Error fetching user details: ${error.message}`);
        console.error(error.stack);
        res.status(500).send('An error occurred while fetching user details');
    }
});

module.exports = router;