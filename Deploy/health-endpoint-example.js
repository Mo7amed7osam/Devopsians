// ===============================================
// Health Check Endpoint for Backend
// Add this to your backend/routes/metaRoutes.js or create a new health route
// ===============================================

/**
 * Health check endpoint for Docker health monitoring
 * Returns service status and basic information
 */

const express = require('express');
const router = express.Router();

// Simple health check
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        deployEnv: process.env.DEPLOY_ENV || 'unknown'
    });
});

// Detailed health check (includes database check)
router.get('/health/detailed', async (req, res) => {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        deployEnv: process.env.DEPLOY_ENV || 'unknown',
        services: {
            api: 'operational',
            database: 'unknown'
        }
    };

    try {
        // Check database connection (adjust based on your DB setup)
        const mongoose = require('mongoose');
        
        if (mongoose.connection.readyState === 1) {
            healthStatus.services.database = 'operational';
        } else {
            healthStatus.services.database = 'disconnected';
            healthStatus.status = 'degraded';
        }
    } catch (error) {
        healthStatus.services.database = 'error';
        healthStatus.status = 'unhealthy';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
});

// Readiness check (for Kubernetes/orchestration)
router.get('/ready', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        
        if (mongoose.connection.readyState === 1) {
            res.status(200).json({ ready: true });
        } else {
            res.status(503).json({ ready: false, reason: 'database not connected' });
        }
    } catch (error) {
        res.status(503).json({ ready: false, reason: error.message });
    }
});

// Liveness check (for Kubernetes/orchestration)
router.get('/live', (req, res) => {
    res.status(200).json({ alive: true });
});

module.exports = router;
