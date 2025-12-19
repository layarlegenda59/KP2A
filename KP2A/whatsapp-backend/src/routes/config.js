const express = require('express');
const router = express.Router();

/**
 * Configuration API Routes
 * Handles message templates and bot configuration
 */
function createConfigRoutes(templateManagerService, supabaseClient) {
  
  // Get all message templates
  router.get('/templates', async (req, res) => {
    try {
      const { category, active_only = 'false' } = req.query;
      
      const options = {};
      if (category) {
        options.category = category;
      }
      if (active_only === 'true') {
        options.activeOnly = true;
      }
      
      const templates = await templateManagerService.getAllTemplates(options);
      
      res.json({
        success: true,
        data: {
          templates: templates,
          count: templates.length,
          query_options: options,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting templates:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get specific template by name
  router.get('/templates/:templateName', async (req, res) => {
    try {
      const { templateName } = req.params;
      
      const template = await templateManagerService.getTemplate(templateName);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({
        success: true,
        data: {
          template: template,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting template:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Create new template
  router.post('/templates', async (req, res) => {
    try {
      const {
        name,
        content,
        category = 'general',
        description = '',
        variables = [],
        is_active = true
      } = req.body;
      
      // Validate required fields
      if (!name || !content) {
        return res.status(400).json({
          success: false,
          error: 'Template name and content are required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Validate template content
      const validation = templateManagerService.validateTemplate(content, variables);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Template validation failed',
          details: validation.errors,
          timestamp: new Date().toISOString()
        });
      }
      
      // Check if template already exists
      const existingTemplate = await templateManagerService.getTemplate(name);
      if (existingTemplate) {
        return res.status(409).json({
          success: false,
          error: 'Template with this name already exists',
          timestamp: new Date().toISOString()
        });
      }
      
      // Create template
      const templateData = {
        name,
        content,
        category,
        description,
        variables,
        is_active
      };
      
      const result = await templateManagerService.saveTemplate(name, templateData);
      
      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: {
          template: result,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Update existing template
  router.put('/templates/:templateName', async (req, res) => {
    try {
      const { templateName } = req.params;
      const {
        content,
        category,
        description,
        variables,
        is_active
      } = req.body;
      
      // Check if template exists
      const existingTemplate = await templateManagerService.getTemplate(templateName);
      if (!existingTemplate) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
          timestamp: new Date().toISOString()
        });
      }
      
      // Prepare update data
      const updateData = { ...existingTemplate };
      
      if (content !== undefined) {
        updateData.content = content;
      }
      if (category !== undefined) {
        updateData.category = category;
      }
      if (description !== undefined) {
        updateData.description = description;
      }
      if (variables !== undefined) {
        updateData.variables = variables;
      }
      if (is_active !== undefined) {
        updateData.is_active = is_active;
      }
      
      // Validate template content if changed
      if (content !== undefined) {
        const validation = templateManagerService.validateTemplate(
          updateData.content, 
          updateData.variables
        );
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: 'Template validation failed',
            details: validation.errors,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Update template
      const result = await templateManagerService.saveTemplate(templateName, updateData);
      
      res.json({
        success: true,
        message: 'Template updated successfully',
        data: {
          template: result,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Delete template
  router.delete('/templates/:templateName', async (req, res) => {
    try {
      const { templateName } = req.params;
      
      // Check if template exists
      const existingTemplate = await templateManagerService.getTemplate(templateName);
      if (!existingTemplate) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
          timestamp: new Date().toISOString()
        });
      }
      
      // Delete template
      await templateManagerService.deleteTemplate(templateName);
      
      res.json({
        success: true,
        message: 'Template deleted successfully',
        data: {
          deleted_template: templateName,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test template rendering
  router.post('/templates/:templateName/test', async (req, res) => {
    try {
      const { templateName } = req.params;
      const { variables = {} } = req.body;
      
      // Get template
      const template = await templateManagerService.getTemplate(templateName);
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
          timestamp: new Date().toISOString()
        });
      }
      
      // Render template with provided variables
      const renderedContent = await templateManagerService.renderTemplate(
        templateName, 
        variables
      );
      
      res.json({
        success: true,
        data: {
          template_name: templateName,
          original_content: template.content,
          rendered_content: renderedContent,
          variables_used: variables,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error testing template:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get template usage statistics
  router.get('/templates/:templateName/stats', async (req, res) => {
    try {
      const { templateName } = req.params;
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
      
      // Get template usage statistics
      const stats = await templateManagerService.getTemplateUsageStats(templateName, options);
      
      res.json({
        success: true,
        data: {
          template_name: templateName,
          usage_stats: stats,
          query_options: options,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting template stats:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get template categories
  router.get('/templates/categories/list', async (req, res) => {
    try {
      const { data: templates, error } = await supabaseClient
        .from('message_templates')
        .select('category')
        .eq('is_active', true);
      
      if (error) {
        throw error;
      }
      
      // Get unique categories
      const categories = [...new Set(templates.map(t => t.category))].sort();
      
      res.json({
        success: true,
        data: {
          categories: categories,
          count: categories.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting template categories:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Bulk update templates
  router.post('/templates/bulk-update', async (req, res) => {
    try {
      const { updates } = req.body;
      
      if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({
          success: false,
          error: 'Updates array is required',
          timestamp: new Date().toISOString()
        });
      }
      
      if (updates.length > 50) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 50 templates can be updated at once',
          timestamp: new Date().toISOString()
        });
      }
      
      const results = [];
      
      for (const update of updates) {
        try {
          const { name, ...updateData } = update;
          
          if (!name) {
            results.push({
              name: 'unknown',
              success: false,
              error: 'Template name is required'
            });
            continue;
          }
          
          // Check if template exists
          const existingTemplate = await templateManagerService.getTemplate(name);
          if (!existingTemplate) {
            results.push({
              name: name,
              success: false,
              error: 'Template not found'
            });
            continue;
          }
          
          // Update template
          const result = await templateManagerService.saveTemplate(name, {
            ...existingTemplate,
            ...updateData
          });
          
          results.push({
            name: name,
            success: true,
            template: result
          });
          
        } catch (error) {
          results.push({
            name: update.name || 'unknown',
            success: false,
            error: error.message
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      res.json({
        success: true,
        message: `Bulk update completed: ${successCount} successful, ${failureCount} failed`,
        data: {
          total: updates.length,
          successful: successCount,
          failed: failureCount,
          results: results,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error bulk updating templates:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}

module.exports = createConfigRoutes;