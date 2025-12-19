const express = require('express');
const router = express.Router();

/**
 * Members API Routes
 * Handles member validation and information retrieval
 */
function createMembersRoutes(memberValidationService) {
  
  // Validate member by phone number
  router.post('/validate', async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      // Validate required fields
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'Phone number is required',
          timestamp: new Date().toISOString()
        });
      }
      
      // Validate member
      const validationResult = await memberValidationService.validateMember(phoneNumber);
      
      if (validationResult.isValid) {
        res.json({
          success: true,
          data: {
            isValid: true,
            member: validationResult.member,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Member not found',
          data: {
            isValid: false,
            phoneNumber: phoneNumber,
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error('Error validating member:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get member profile by phone number
  router.get('/profile/:phoneNumber', async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      
      // Validate member first
      const validationResult = await memberValidationService.validateMember(phoneNumber);
      
      if (!validationResult.isValid) {
        return res.status(404).json({
          success: false,
          error: 'Member not found',
          timestamp: new Date().toISOString()
        });
      }
      
      // Get member profile
      const profile = await memberValidationService.getMemberProfile(validationResult.member.id);
      
      res.json({
        success: true,
        data: {
          profile: profile,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting member profile:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get member dues information
  router.get('/dues/:phoneNumber', async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      
      // Validate member first
      const validationResult = await memberValidationService.validateMember(phoneNumber);
      
      if (!validationResult.isValid) {
        return res.status(404).json({
          success: false,
          error: 'Member not found',
          timestamp: new Date().toISOString()
        });
      }
      
      // Get dues information
      const dues = await memberValidationService.getMemberDues(validationResult.member.id);
      
      res.json({
        success: true,
        data: {
          dues: dues,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting member dues:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get member loans information
  router.get('/loans/:phoneNumber', async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      
      // Validate member first
      const validationResult = await memberValidationService.validateMember(phoneNumber);
      
      if (!validationResult.isValid) {
        return res.status(404).json({
          success: false,
          error: 'Member not found',
          timestamp: new Date().toISOString()
        });
      }
      
      // Get loans information
      const loans = await memberValidationService.getMemberLoans(validationResult.member.id);
      
      res.json({
        success: true,
        data: {
          loans: loans,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting member loans:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get member activity summary
  router.get('/activity/:phoneNumber', async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const { months = 6 } = req.query;
      
      // Validate member first
      const validationResult = await memberValidationService.validateMember(phoneNumber);
      
      if (!validationResult.isValid) {
        return res.status(404).json({
          success: false,
          error: 'Member not found',
          timestamp: new Date().toISOString()
        });
      }
      
      // Get activity summary
      const activity = await memberValidationService.getMemberActivity(
        validationResult.member.id, 
        parseInt(months)
      );
      
      res.json({
        success: true,
        data: {
          activity: activity,
          period_months: parseInt(months),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting member activity:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Bulk validate members
  router.post('/validate-bulk', async (req, res) => {
    try {
      const { phoneNumbers } = req.body;
      
      // Validate required fields
      if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
        return res.status(400).json({
          success: false,
          error: 'Phone numbers array is required',
          timestamp: new Date().toISOString()
        });
      }
      
      if (phoneNumbers.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 100 phone numbers allowed per request',
          timestamp: new Date().toISOString()
        });
      }
      
      // Validate all members
      const results = await Promise.all(
        phoneNumbers.map(async (phoneNumber) => {
          try {
            const validationResult = await memberValidationService.validateMember(phoneNumber);
            return {
              phoneNumber: phoneNumber,
              isValid: validationResult.isValid,
              member: validationResult.isValid ? validationResult.member : null
            };
          } catch (error) {
            return {
              phoneNumber: phoneNumber,
              isValid: false,
              error: error.message
            };
          }
        })
      );
      
      const validMembers = results.filter(r => r.isValid);
      const invalidMembers = results.filter(r => !r.isValid);
      
      res.json({
        success: true,
        data: {
          total: phoneNumbers.length,
          valid: validMembers.length,
          invalid: invalidMembers.length,
          results: results,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error bulk validating members:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}

module.exports = createMembersRoutes;