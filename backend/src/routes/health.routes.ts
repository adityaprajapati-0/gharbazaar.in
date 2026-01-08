import { Router } from 'express';
import { apmService, apmMiddleware } from '../services/apm.service';
import { authenticate, authorize } from '../middleware/auth';
import { healthController } from '../controllers/health.controller';

const router = Router();

/**
 * @route   GET /api/v1/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', healthController.healthCheck);

/**
 * @route   GET /api/v1/health/detailed
 * @desc    Detailed health check with all services
 * @access  Admin only
 */
router.get('/detailed', authenticate, authorize('admin'), healthController.detailedHealthCheck);

/**
 * @route   GET /api/v1/health/ready
 * @desc    Readiness check for k8s/docker
 * @access  Public
 */
router.get('/ready', healthController.readinessCheck);

/**
 * @route   GET /api/v1/health/live
 * @desc    Liveness check for k8s/docker
 * @access  Public
 */
router.get('/live', healthController.livenessCheck);

/**
 * @route   GET /api/v1/health/stats
 * @desc    Get API stats
 * @access  Admin only
 */
router.get('/stats', authenticate, authorize('admin'), healthController.getStats);

/**
 * @route   GET /api/v1/health/cache
 * @desc    Get cache statistics
 * @access  Admin only
 */
router.get('/cache', authenticate, authorize('admin'), healthController.getCacheStats);

/**
 * @route   GET /api/v1/health/metrics
 * @desc    Get APM metrics
 * @access  Admin only
 */
router.get('/metrics', authenticate, authorize('admin'), (req, res) => {
    const period = parseInt(req.query.period as string) || 60;
    const metrics = apmService.getMetrics(period);
    const health = apmService.getSystemHealth();
    const alerts = apmService.checkAlerts();

    res.json({
        success: true,
        data: {
            period: `${period} minutes`,
            timestamp: new Date().toISOString(),
            metrics,
            system: health,
            alerts,
        },
    });
});

/**
 * @route   GET /api/v1/health/alerts
 * @desc    Get active alerts
 * @access  Admin only
 */
router.get('/alerts', authenticate, authorize('admin'), (req, res) => {
    const alerts = apmService.checkAlerts();

    res.json({
        success: true,
        data: {
            alertCount: alerts.length,
            alerts,
            timestamp: new Date().toISOString(),
        },
    });
});

export default router;
