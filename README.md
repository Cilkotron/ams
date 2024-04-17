# Account Management App

An application designed to integrate a comprehensive account management system, facilitating web scraping activities with an added focus on user authentication, credit-based billing, and account management functionalities.

## Overview

This project utilizes a MERN stack architecture, leveraging MongoDB, Express.js, React (implied for front-end, though not detailed), and Node.js. The server-side logic is built on Express.js, managing routes for authentication, billing, and user dashboard functionalities. MongoDB is used for data persistence, storing user credentials, billing information, and usage metrics. The application ensures secure authentication with JWT for session management and integrates Stripe for credit-based billing.

## Features

- **User Authentication**: Secure registration, login, and password reset functionalities. Users remain logged in with JWTs, persisting sessions across server restarts.
- **Credit-Based Billing**: Integration with Stripe to manage billing based on credit usage, with tiered pricing structures.
- **Dashboard**: Users can view their API key, and track credit usage over different intervals.
- **Auto-Replenish Credits**: Users can enable auto-replenishing of credits upon reaching a set threshold.
- **Support Contact**: A dedicated page for users to reach out for support.

## Getting Started

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
