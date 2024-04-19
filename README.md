# Account Management App

An application designed to manage user accounts for a web scraping service, incorporating features like authentication, credit-based billing with Stripe, and a dashboard for account and usage tracking.

## Overview

This project leverages Node.js and Express for the backend, MongoDB for data storage, and integrates Stripe for handling credit-based billing. It uses JWT for session management to keep users logged in across sessions. The frontend styling is powered by Bootstrap, ensuring a responsive and intuitive user interface.

## Features

- **User Authentication**: Secure login, registration, and password reset functionalities.
- **Credit-Based Billing**: Allows users to purchase credits for web scraping, with Stripe handling the transactions.
- **Dashboard**: Users can view their API key, credit usage, and manage their account settings.
- **Auto-Replenish**: Users can opt-in to automatically purchase credits when their balance falls below a certain threshold.
- **Support Contact**: A dedicated page for users to reach out for support or inquiries.

## Getting started

### Requirements

- Node.js
- MongoDB
- npm or yarn

### Quickstart

1. Clone the repository.
2. Copy `.env.example` to `.env` and fill in your database and environment details.
3. Install dependencies with `npm install`.
4. Start the server with `npm start`.
5. Navigate to `http://localhost:3000` in your browser to access the application.

### License

Copyright (c) 2024.