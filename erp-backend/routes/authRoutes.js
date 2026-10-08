const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/me
router.get('/me', authController.getMe);

// POST /api/auth/logout
router.post('/logout', authController.logout);

module.exports = router;
