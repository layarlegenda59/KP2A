const express = require('express');
const router = express.Router();

/**
 * Analytics API Routes
 * Handles bot usage statistics and analytics data
 */
function createAnalyticsRoutes(analyticsLoggerService) {
  
  // Get usage statistics
  router.get('/usage', async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        memberId,
        commandType
      } = req.query;
      
      // Parse dates if provided
      const options = {};
      if (startDate) {
        options.startDate = new Date(startDate);
        if (isNaN(options.startDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid startDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      if (endDate) {
        options.endDate = new Date(endDate);
        if (isNaN(options.endDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid endDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      if (memberId) {
        options.memberId = memberId;
      }
      
      if (commandType) {
        options.commandType = commandType;
      }
      
      // Get usage statistics
      const statistics = await analyticsLoggerService.getUsageStatistics(options);
      
      res.json({
        success: true,
        data: {
          statistics: statistics,
          query_options: options,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting usage statistics:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get top commands
  router.get('/top-commands', async (req, res) => {
    try {
      const {
        limit = 10,
        startDate,
        endDate
      } = req.query;
      
      // Parse options
      const options = {};
      if (startDate) {
        options.startDate = new Date(startDate);
        if (isNaN(options.startDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid startDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      if (endDate) {
        options.endDate = new Date(endDate);
        if (isNaN(options.endDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid endDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Validate limit
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          error: 'Limit must be a number between 1 and 100',
          timestamp: new Date().toISOString()
        });
      }
      
      // Get top commands
      const topCommands = await analyticsLoggerService.getTopCommands(limitNum, options);
      
      res.json({
        success: true,
        data: {
          top_commands: topCommands,
          limit: limitNum,
          query_options: options,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting top commands:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get active users
  router.get('/active-users', async (req, res) => {
    try {
      const {
        limit = 50,
        startDate,
        endDate
      } = req.query;
      
      // Parse options
      const options = {};
      if (startDate) {
        options.startDate = new Date(startDate);
        if (isNaN(options.startDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid startDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      if (endDate) {
        options.endDate = new Date(endDate);
        if (isNaN(options.endDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid endDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Validate limit
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
        return res.status(400).json({
          success: false,
          error: 'Limit must be a number between 1 and 200',
          timestamp: new Date().toISOString()
        });
      }
      
      options.limit = limitNum;
      
      // Get active users
      const activeUsers = await analyticsLoggerService.getActiveUsers(options);
      
      res.json({
        success: true,
        data: {
          active_users: activeUsers,
          limit: limitNum,
          query_options: options,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting active users:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get error summary
  router.get('/errors', async (req, res) => {
    try {
      const {
        startDate,
        endDate
      } = req.query;
      
      // Parse options
      const options = {};
      if (startDate) {
        options.startDate = new Date(startDate);
        if (isNaN(options.startDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid startDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      if (endDate) {
        options.endDate = new Date(endDate);
        if (isNaN(options.endDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid endDate format. Use ISO 8601 format.',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Get error summary
      const errorSummary = await analyticsLoggerService.getErrorSummary(options);
      
      res.json({
        success: true,
        data: {
          error_summary: errorSummary,
          query_options: options,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting error summary:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get analytics dashboard data
  router.get('/dashboard', async (req, res) => {
    try {
      const {
        period = '7d' // 1d, 7d, 30d, 90d
      } = req.query;
      
      // Calculate date range based on period
      let startDate;
      const endDate = new Date();
      
      switch (period) {
        case '1d':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid period. Use: 1d, 7d, 30d, or 90d',
            timestamp: new Date().toISOString()
          });
      }
      
      const options = { startDate, endDate };
      
      // Get all dashboard data in parallel
      const [
        statistics,
        topCommands,
        activeUsers,
        errorSummary
      ] = await Promise.all([
        analyticsLoggerService.getUsageStatistics(options),
        analyticsLoggerService.getTopCommands(10, options),
        analyticsLoggerService.getActiveUsers({ ...options, limit: 20 }),
        analyticsLoggerService.getErrorSummary(options)
      ]);
      
      res.json({
        success: true,
        data: {
          period: period,
          date_range: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          },
          overview: {
            total_interactions: statistics.total_interactions,
            successful_commands: statistics.successful_commands,
            failed_commands: statistics.failed_commands,
            unique_users: statistics.unique_users,
            unique_members: statistics.unique_members,
            success_rate: statistics.total_interactions > 0 
              ? ((statistics.successful_commands / statistics.total_interactions) * 100).toFixed(2)
              : 0
          },
          top_commands: topCommands,
          active_users: activeUsers.slice(0, 10), // Top 10 most active
          error_summary: errorSummary,
          hourly_distribution: statistics.hourly_distribution,
          daily_distribution: statistics.daily_distribution,
          response_times: statistics.response_times,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Force flush pending analytics logs
  router.post('/flush', async (req, res) => {
    try {
      const pendingCount = analyticsLoggerService.getPendingLogsCount();
      
      await analyticsLoggerService.forceFlushing();
      
      res.json({
        success: true,
        message: 'Analytics logs flushed successfully',
        data: {
          flushed_logs: pendingCount,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error flushing analytics logs:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get analytics service status
  router.get('/status', async (req, res) => {
    try {
      const pendingCount = analyticsLoggerService.getPendingLogsCount();
      
      res.json({
        success: true,
        data: {
          service_status: 'active',
          pending_logs: pendingCount,
          batch_size: analyticsLoggerService.batchSize,
          batch_timeout: analyticsLoggerService.batchTimeout,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting analytics status:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}

module.exports = createAnalyticsRoutes;