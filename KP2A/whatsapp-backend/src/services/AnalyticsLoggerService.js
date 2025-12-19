/**
 * Analytics Logger Service
 * Tracks bot usage, command statistics, and member interactions
 * Provides comprehensive analytics for WhatsApp bot performance monitoring
 */
class AnalyticsLoggerService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.batchSize = 10;
        this.batchTimeout = 5000; // 5 seconds
        this.pendingLogs = [];
        this.batchTimer = null;
    }

    /**
     * Log command usage
     * @param {string} memberId - Member ID
     * @param {string} command - Command used
     * @param {string} phoneNumber - Phone number
     * @param {Object} metadata - Additional metadata
     */
    async logCommandUsage(memberId, command, phoneNumber, metadata = {}) {
        const logEntry = {
            member_id: memberId,
            command_type: command,
            phone_number: phoneNumber,
            success: true,
            response_time_ms: metadata.responseTime || 0,
            error_message: null,
            session_id: metadata.sessionId || null,
            request_content: metadata.requestContent || null,
            response_content: metadata.responseContent || null,
            analytics_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString()
        };

        await this.addToBatch(logEntry);
    }

    /**
     * Log message received
     * @param {string} phoneNumber - Phone number
     * @param {string} messageContent - Message content
     * @param {string} memberId - Member ID (if member)
     */
    async logMessageReceived(phoneNumber, messageContent, memberId = null) {
        const logEntry = {
            member_id: memberId,
            command_type: 'message_received',
            phone_number: phoneNumber,
            success: true,
            response_time_ms: 0,
            error_message: null,
            session_id: null,
            request_content: messageContent ? messageContent.substring(0, 500) : '', // Handle undefined/null content
            response_content: null,
            analytics_date: new Date().toISOString().split('T')[0], // Add analytics_date field
            created_at: new Date().toISOString()
        };

        await this.addToBatch(logEntry);
    }

    /**
     * Log error occurrence
     * @param {string} phoneNumber - Phone number
     * @param {string} errorType - Type of error
     * @param {string} errorMessage - Error message
     * @param {string} memberId - Member ID (if applicable)
     */
    async logError(phoneNumber, errorType, errorMessage, memberId = null) {
        const logEntry = {
            member_id: memberId,
            command_type: errorType,
            phone_number: phoneNumber,
            success: false,
            response_time_ms: 0,
            error_message: errorMessage.substring(0, 500), // Limit error message length
            session_id: null,
            request_content: null,
            response_content: null,
            analytics_date: new Date().toISOString().split('T')[0], // Add analytics_date field
            created_at: new Date().toISOString()
        };

        await this.addToBatch(logEntry);
    }

    /**
     * Log non-member access attempt
     * @param {string} phoneNumber - Phone number
     * @param {string} messageContent - Message content
     */
    async logNonMemberAccess(phoneNumber, messageContent) {
        const logEntry = {
            member_id: null,
            command_type: 'non_member_access',
            phone_number: phoneNumber,
            success: false,
            response_time_ms: 0,
            error_message: 'Access denied - not a registered member',
            session_id: null,
            request_content: messageContent ? messageContent.substring(0, 500) : '', // Handle undefined/null content
            response_content: null,
            analytics_date: new Date().toISOString().split('T')[0], // Add analytics_date field
            created_at: new Date().toISOString()
        };

        await this.addToBatch(logEntry);
    }

    /**
     * Log business hours access attempt
     * @param {string} phoneNumber - Phone number
     * @param {string} memberId - Member ID
     */
    async logBusinessHoursAccess(phoneNumber, memberId) {
        const logEntry = {
            member_id: memberId,
            command_type: 'business_hours_access',
            phone_number: phoneNumber,
            success: false,
            response_time_ms: 0,
            error_message: 'Access outside business hours',
            session_id: null,
            request_content: null,
            response_content: null,
            analytics_date: new Date().toISOString().split('T')[0], // Add analytics_date field
            created_at: new Date().toISOString()
        };

        await this.addToBatch(logEntry);
    }

    /**
     * Add log entry to batch for efficient database writes
     * @param {Object} logEntry - Log entry to add
     */
    async addToBatch(logEntry) {
        this.pendingLogs.push(logEntry);

        // If batch is full, flush immediately
        if (this.pendingLogs.length >= this.batchSize) {
            await this.flushBatch();
        } else {
            // Set timer to flush batch after timeout
            this.resetBatchTimer();
        }
    }

    /**
     * Reset batch timer
     */
    resetBatchTimer() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }

        this.batchTimer = setTimeout(async () => {
            await this.flushBatch();
        }, this.batchTimeout);
    }

    /**
     * Flush pending logs to database
     */
    async flushBatch() {
        if (this.pendingLogs.length === 0) {
            return;
        }

        try {
            const logsToFlush = [...this.pendingLogs];
            this.pendingLogs = [];

            if (this.batchTimer) {
                clearTimeout(this.batchTimer);
                this.batchTimer = null;
            }

            const { error } = await this.supabase
                .from('whatsapp_analytics')
                .insert(logsToFlush);

            if (error) {
                console.error('Error flushing analytics batch:', error);
                // Re-add failed logs to pending (with limit to prevent infinite growth)
                if (this.pendingLogs.length < 100) {
                    this.pendingLogs.unshift(...logsToFlush);
                }
            } else {
                console.log(`✅ Flushed ${logsToFlush.length} analytics entries`);
            }

        } catch (error) {
            console.error('Error in flushBatch:', error);
        }
    }

    /**
     * Get usage statistics
     * @param {Object} options - Query options
     * @returns {Object} - Usage statistics
     */
    async getUsageStatistics(options = {}) {
        try {
            const {
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                endDate = new Date(),
                memberId = null,
                commandType = null
            } = options;

            let query = this.supabase
                .from('whatsapp_analytics')
                .select('*')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString());

            if (memberId) {
                query = query.eq('member_id', memberId);
            }

            if (commandType) {
                query = query.eq('command_type', commandType);
            }

            const { data: analytics, error } = await query;

            if (error) {
                throw error;
            }

            return this.processStatistics(analytics || []);

        } catch (error) {
            console.error('Error getting usage statistics:', error);
            return this.getEmptyStatistics();
        }
    }

    /**
     * Process raw analytics data into statistics
     * @param {Array} analytics - Raw analytics data
     * @returns {Object} - Processed statistics
     */
    processStatistics(analytics) {
        const stats = {
            total_interactions: analytics.length,
            successful_commands: analytics.filter(a => a.success).length,
            failed_commands: analytics.filter(a => !a.success).length,
            unique_users: new Set(analytics.map(a => a.phone_number)).size,
            unique_members: new Set(analytics.filter(a => a.member_id).map(a => a.member_id)).size,
            command_breakdown: {},
            hourly_distribution: {},
            daily_distribution: {},
            error_breakdown: {},
            response_times: {
                average: 0,
                min: 0,
                max: 0,
                count: 0
            }
        };

        // Process command breakdown
        analytics.forEach(entry => {
            const command = entry.command_type;
            if (!stats.command_breakdown[command]) {
                stats.command_breakdown[command] = {
                    count: 0,
                    success: 0,
                    failed: 0
                };
            }
            stats.command_breakdown[command].count++;
            if (entry.success) {
                stats.command_breakdown[command].success++;
            } else {
                stats.command_breakdown[command].failed++;
            }
        });

        // Process time distributions
        analytics.forEach(entry => {
            const date = new Date(entry.created_at);
            const hour = date.getHours();
            const day = date.toISOString().split('T')[0];

            stats.hourly_distribution[hour] = (stats.hourly_distribution[hour] || 0) + 1;
            stats.daily_distribution[day] = (stats.daily_distribution[day] || 0) + 1;
        });

        // Process error breakdown
        analytics.filter(a => !a.success).forEach(entry => {
            const errorType = entry.command_type;
            stats.error_breakdown[errorType] = (stats.error_breakdown[errorType] || 0) + 1;
        });

        // Process response times
        const responseTimes = analytics
            .filter(a => a.response_time !== null && a.response_time > 0)
            .map(a => a.response_time);

        if (responseTimes.length > 0) {
            stats.response_times = {
                average: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
                min: Math.min(...responseTimes),
                max: Math.max(...responseTimes),
                count: responseTimes.length
            };
        }

        return stats;
    }

    /**
     * Get empty statistics structure
     * @returns {Object} - Empty statistics
     */
    getEmptyStatistics() {
        return {
            total_interactions: 0,
            successful_commands: 0,
            failed_commands: 0,
            unique_users: 0,
            unique_members: 0,
            command_breakdown: {},
            hourly_distribution: {},
            daily_distribution: {},
            error_breakdown: {},
            response_times: {
                average: 0,
                min: 0,
                max: 0,
                count: 0
            }
        };
    }

    /**
     * Get top commands
     * @param {number} limit - Number of top commands to return
     * @param {Object} options - Query options
     * @returns {Array} - Top commands
     */
    async getTopCommands(limit = 10, options = {}) {
        try {
            const stats = await this.getUsageStatistics(options);
            
            return Object.entries(stats.command_breakdown)
                .map(([command, data]) => ({
                    command,
                    ...data,
                    success_rate: data.count > 0 ? (data.success / data.count * 100).toFixed(2) : 0
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);

        } catch (error) {
            console.error('Error getting top commands:', error);
            return [];
        }
    }

    /**
     * Get active users
     * @param {Object} options - Query options
     * @returns {Array} - Active users
     */
    async getActiveUsers(options = {}) {
        try {
            const {
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                endDate = new Date(),
                limit = 50
            } = options;

            const { data: analytics, error } = await this.supabase
                .from('whatsapp_analytics')
                .select('phone_number, member_id, created_at, command_type, success')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            // Group by phone number
            const userStats = {};
            analytics.forEach(entry => {
                const phone = entry.phone_number;
                if (!userStats[phone]) {
                    userStats[phone] = {
                        phone_number: phone,
                        member_id: entry.member_id,
                        total_interactions: 0,
                        successful_commands: 0,
                        last_interaction: entry.created_at,
                        commands_used: new Set()
                    };
                }
                
                userStats[phone].total_interactions++;
                if (entry.success) {
                    userStats[phone].successful_commands++;
                }
                userStats[phone].commands_used.add(entry.command_type);
                
                // Update last interaction if this is more recent
                if (new Date(entry.created_at) > new Date(userStats[phone].last_interaction)) {
                    userStats[phone].last_interaction = entry.created_at;
                }
            });

            // Convert to array and add computed fields
            return Object.values(userStats)
                .map(user => ({
                    ...user,
                    unique_commands: user.commands_used.size,
                    commands_used: Array.from(user.commands_used),
                    success_rate: user.total_interactions > 0 
                        ? (user.successful_commands / user.total_interactions * 100).toFixed(2)
                        : 0
                }))
                .sort((a, b) => b.total_interactions - a.total_interactions)
                .slice(0, limit);

        } catch (error) {
            console.error('Error getting active users:', error);
            return [];
        }
    }

    /**
     * Get error summary
     * @param {Object} options - Query options
     * @returns {Object} - Error summary
     */
    async getErrorSummary(options = {}) {
        try {
            const {
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                endDate = new Date()
            } = options;

            const { data: errors, error } = await this.supabase
                .from('whatsapp_analytics')
                .select('command_type, error_message, phone_number, created_at')
                .eq('success', false)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            const errorBreakdown = {};
            const recentErrors = errors.slice(0, 20); // Last 20 errors

            errors.forEach(errorEntry => {
                const type = errorEntry.command_type;
                if (!errorBreakdown[type]) {
                    errorBreakdown[type] = {
                        count: 0,
                        unique_users: new Set(),
                        recent_messages: []
                    };
                }
                
                errorBreakdown[type].count++;
                errorBreakdown[type].unique_users.add(errorEntry.phone_number);
                
                if (errorBreakdown[type].recent_messages.length < 5) {
                    errorBreakdown[type].recent_messages.push({
                        message: errorEntry.error_message,
                        timestamp: errorEntry.created_at,
                        phone: errorEntry.phone_number
                    });
                }
            });

            // Convert sets to counts
            Object.keys(errorBreakdown).forEach(type => {
                errorBreakdown[type].unique_users = errorBreakdown[type].unique_users.size;
            });

            return {
                total_errors: errors.length,
                error_breakdown: errorBreakdown,
                recent_errors: recentErrors
            };

        } catch (error) {
            console.error('Error getting error summary:', error);
            return {
                total_errors: 0,
                error_breakdown: {},
                recent_errors: []
            };
        }
    }

    /**
     * Force flush all pending logs
     */
    async forceFlushing() {
        await this.flushBatch();
    }

    /**
     * Get pending logs count
     * @returns {number} - Number of pending logs
     */
    getPendingLogsCount() {
        return this.pendingLogs.length;
    }

    /**
     * Clear all pending logs (use with caution)
     */
    clearPendingLogs() {
        this.pendingLogs = [];
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
    }
}

module.exports = AnalyticsLoggerService;