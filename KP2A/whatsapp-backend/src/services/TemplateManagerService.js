/**
 * Template Manager Service
 * Manages message templates with variable substitution and formatting
 * Provides dynamic message generation for WhatsApp bot responses
 */
class TemplateManagerService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.templateCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get template by name with caching
     * @param {string} templateName - Name of the template
     * @returns {Object|null} - Template object or null if not found
     */
    async getTemplate(templateName) {
        try {
            // Check cache first
            const cached = this.templateCache.get(templateName);
            if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
                return cached.template;
            }

            // Fetch from database
            const { data: templates, error } = await this.supabase
                .from('message_templates')
                .select('*')
                .eq('name', templateName)
                .eq('is_active', true)
                .limit(1);

            if (error) {
                console.error('Error fetching template:', error);
                return null;
            }

            if (!templates || templates.length === 0) {
                return null;
            }

            const template = templates[0];
            
            // Cache the template
            this.templateCache.set(templateName, {
                template,
                timestamp: Date.now()
            });

            return template;

        } catch (error) {
            console.error('Error in getTemplate:', error);
            return null;
        }
    }

    /**
     * Render template with variables
     * @param {string} templateName - Name of the template
     * @param {Object} variables - Variables to substitute
     * @returns {string|null} - Rendered message or null if template not found
     */
    async renderTemplate(templateName, variables = {}) {
        try {
            const template = await this.getTemplate(templateName);
            
            if (!template) {
                console.warn(`Template '${templateName}' not found`);
                return null;
            }

            let content = template.content;

            // Substitute variables
            content = this.substituteVariables(content, variables);

            return content;

        } catch (error) {
            console.error('Error rendering template:', error);
            return null;
        }
    }

    /**
     * Substitute variables in template content
     * @param {string} content - Template content
     * @param {Object} variables - Variables to substitute
     * @returns {string} - Content with substituted variables
     */
    substituteVariables(content, variables) {
        let result = content;

        // Replace {{variable}} patterns
        Object.keys(variables).forEach(key => {
            const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            const value = variables[key] !== null && variables[key] !== undefined 
                ? String(variables[key]) 
                : '';
            result = result.replace(pattern, value);
        });

        // Handle special formatting functions
        result = this.applyFormatting(result, variables);

        return result;
    }

    /**
     * Apply special formatting functions
     * @param {string} content - Content to format
     * @param {Object} variables - Available variables
     * @returns {string} - Formatted content
     */
    applyFormatting(content, variables) {
        let result = content;

        // Format currency: {{formatRupiah(amount)}}
        result = result.replace(/{{formatRupiah\(([^)]+)\)}}/g, (match, varName) => {
            const amount = variables[varName.trim()];
            return this.formatRupiah(amount);
        });

        // Format date: {{formatDate(date)}}
        result = result.replace(/{{formatDate\(([^)]+)\)}}/g, (match, varName) => {
            const date = variables[varName.trim()];
            return this.formatDate(date);
        });

        // Format phone: {{formatPhone(phone)}}
        result = result.replace(/{{formatPhone\(([^)]+)\)}}/g, (match, varName) => {
            const phone = variables[varName.trim()];
            return this.formatPhone(phone);
        });

        // Conditional content: {{if(condition, trueContent, falseContent)}}
        result = result.replace(/{{if\(([^,]+),([^,]+),([^)]+)\)}}/g, (match, condition, trueContent, falseContent) => {
            const conditionValue = variables[condition.trim()];
            return conditionValue ? trueContent.trim() : falseContent.trim();
        });

        return result;
    }

    /**
     * Create or update template
     * @param {string} name - Template name
     * @param {string} content - Template content
     * @param {string} description - Template description
     * @param {Object} variables - Expected variables
     * @returns {Object} - Operation result
     */
    async saveTemplate(name, content, description = '', variables = {}) {
        try {
            const templateData = {
                name,
                content,
                description,
                variables,
                is_active: true,
                updated_at: new Date().toISOString()
            };

            // Check if template exists
            const { data: existing } = await this.supabase
                .from('message_templates')
                .select('id')
                .eq('name', name)
                .limit(1);

            let result;
            if (existing && existing.length > 0) {
                // Update existing template
                result = await this.supabase
                    .from('message_templates')
                    .update(templateData)
                    .eq('name', name);
            } else {
                // Create new template
                templateData.created_at = new Date().toISOString();
                result = await this.supabase
                    .from('message_templates')
                    .insert([templateData]);
            }

            if (result.error) {
                throw result.error;
            }

            // Clear cache for this template
            this.templateCache.delete(name);

            return {
                success: true,
                message: 'Template saved successfully'
            };

        } catch (error) {
            console.error('Error saving template:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete template
     * @param {string} name - Template name
     * @returns {Object} - Operation result
     */
    async deleteTemplate(name) {
        try {
            const { error } = await this.supabase
                .from('message_templates')
                .delete()
                .eq('name', name);

            if (error) {
                throw error;
            }

            // Clear cache
            this.templateCache.delete(name);

            return {
                success: true,
                message: 'Template deleted successfully'
            };

        } catch (error) {
            console.error('Error deleting template:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * List all templates
     * @param {boolean} activeOnly - Whether to return only active templates
     * @returns {Array} - List of templates
     */
    async listTemplates(activeOnly = true) {
        try {
            let query = this.supabase
                .from('message_templates')
                .select('*')
                .order('name');

            if (activeOnly) {
                query = query.eq('is_active', true);
            }

            const { data: templates, error } = await query;

            if (error) {
                throw error;
            }

            return templates || [];

        } catch (error) {
            console.error('Error listing templates:', error);
            return [];
        }
    }

    /**
     * Get all templates with filtering options
     * @param {Object} options - Filtering options
     * @returns {Array} - List of templates
     */
    async getAllTemplates(options = {}) {
        try {
            let query = this.supabase
                .from('message_templates')
                .select('*')
                .order('name');

            // Apply filters
            if (options.category) {
                query = query.eq('category', options.category);
            }

            if (options.activeOnly !== false) {
                query = query.eq('is_active', true);
            }

            const { data: templates, error } = await query;

            if (error) {
                throw error;
            }

            return templates || [];

        } catch (error) {
            console.error('Error getting all templates:', error);
            return [];
        }
    }

    /**
     * Get template with usage statistics
     * @param {string} templateName - Template name
     * @returns {Object|null} - Template with stats or null
     */
    async getTemplateWithStats(templateName) {
        try {
            const template = await this.getTemplate(templateName);
            
            if (!template) {
                return null;
            }

            // Get usage statistics from analytics
            const { data: analytics, error } = await this.supabase
                .from('whatsapp_analytics')
                .select('id, created_at')
                .eq('template_used', templateName)
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

            const usageCount = analytics ? analytics.length : 0;

            return {
                ...template,
                usage_stats: {
                    last_30_days: usageCount,
                    last_used: analytics && analytics.length > 0 
                        ? analytics[analytics.length - 1].created_at 
                        : null
                }
            };

        } catch (error) {
            console.error('Error getting template with stats:', error);
            return null;
        }
    }

    /**
     * Validate template content
     * @param {string} content - Template content to validate
     * @param {Array} expectedVariables - Expected variables (optional)
     * @returns {Object} - Validation result
     */
    validateTemplate(content, expectedVariables = []) {
        const errors = [];
        const warnings = [];
        const variables = [];

        // Extract variables
        const variableMatches = content.match(/{{[^}]+}}/g);
        if (variableMatches) {
            variableMatches.forEach(match => {
                const variable = match.replace(/[{}]/g, '').trim();
                
                // Check for function calls
                if (variable.includes('(')) {
                    const funcMatch = variable.match(/^(\w+)\(([^)]+)\)$/);
                    if (funcMatch) {
                        const [, funcName, param] = funcMatch;
                        if (!['formatRupiah', 'formatDate', 'formatPhone', 'if'].includes(funcName)) {
                            errors.push(`Unknown function: ${funcName}`);
                        }
                        variables.push(param.trim());
                    } else {
                        errors.push(`Invalid function syntax: ${variable}`);
                    }
                } else {
                    variables.push(variable);
                }
            });
        }

        // Check for unmatched braces
        const openBraces = (content.match(/{{/g) || []).length;
        const closeBraces = (content.match(/}}/g) || []).length;
        if (openBraces !== closeBraces) {
            errors.push('Unmatched template braces');
        }

        // Check content length
        if (content.length > 4096) {
            warnings.push('Template content is very long (>4096 characters)');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            variables: [...new Set(variables)] // Remove duplicates
        };
    }

    /**
     * Format currency to Indonesian Rupiah
     * @param {number} amount - Amount to format
     * @returns {string} - Formatted currency
     */
    formatRupiah(amount) {
        if (!amount || amount === 0) return 'Rp 0';
        
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Format date to Indonesian format
     * @param {string} dateString - Date string to format
     * @returns {string} - Formatted date
     */
    formatDate(dateString) {
        if (!dateString) return 'Tidak tersedia';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return 'Format tanggal tidak valid';
        }
    }

    /**
     * Format phone number
     * @param {string} phone - Phone number to format
     * @returns {string} - Formatted phone number
     */
    formatPhone(phone) {
        if (!phone) return 'Tidak tersedia';
        
        // Format Indonesian phone number
        let cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.startsWith('62')) {
            return `+${cleaned}`;
        } else if (cleaned.startsWith('0')) {
            return `+62${cleaned.substring(1)}`;
        }
        
        return phone;
    }

    /**
     * Clear template cache
     */
    clearCache() {
        this.templateCache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    getCacheStats() {
        return {
            size: this.templateCache.size,
            entries: Array.from(this.templateCache.keys())
        };
    }
}

module.exports = TemplateManagerService;