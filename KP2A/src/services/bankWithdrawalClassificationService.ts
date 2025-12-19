import { supabase } from '../lib/supabase';

// Types for bank withdrawal classification
export interface BankWithdrawalPattern {
  id: string;
  pattern_name: string;
  description_pattern: string;
  amount_range_min: number;
  amount_range_max: number;
  frequency_pattern: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'irregular';
  category_id: string;
  confidence_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassificationLog {
  id: string;
  transaction_id: string;
  suggested_category_id: string;
  confidence_score: number;
  classification_method: string;
  manual_override: boolean;
  override_reason?: string;
  classified_by?: string;
  classification_data: any;
  created_at: string;
}

export interface ClassificationResult {
  suggested_category_id: string;
  confidence_score: number;
  classification_method: string;
  reasoning: string;
  patterns_matched: string[];
}

export interface TransactionClassificationData {
  description: string;
  amount: number;
  transaction_date: string;
  bank_account?: string;
  metadata?: any;
}

export interface ValidationResult {
  is_valid: boolean;
  requires_approval: boolean;
  validation_errors: string[];
  approval_threshold_exceeded: boolean;
}

class BankWithdrawalClassificationService {
  
  /**
   * Classify a bank withdrawal transaction using pattern matching
   */
  async classifyTransaction(transactionData: TransactionClassificationData): Promise<ClassificationResult> {
    try {
      // Get active patterns
      const patterns = await this.getActivePatterns();
      
      let bestMatch: ClassificationResult = {
        suggested_category_id: '',
        confidence_score: 0,
        classification_method: 'pattern_matching',
        reasoning: 'No matching patterns found',
        patterns_matched: []
      };

      // Pattern matching logic
      for (const pattern of patterns) {
        const score = await this.calculatePatternScore(transactionData, pattern);
        
        if (score > bestMatch.confidence_score) {
          bestMatch = {
            suggested_category_id: pattern.category_id,
            confidence_score: score,
            classification_method: 'pattern_matching',
            reasoning: `Matched pattern: ${pattern.pattern_name}`,
            patterns_matched: [pattern.pattern_name]
          };
        }
      }

      // If no good match found, use fallback classification
      if (bestMatch.confidence_score < 50) {
        bestMatch = await this.fallbackClassification(transactionData);
      }

      return bestMatch;
    } catch (error) {
      console.error('Classification error:', error);
      return {
        suggested_category_id: '',
        confidence_score: 0,
        classification_method: 'error',
        reasoning: 'Classification failed due to error',
        patterns_matched: []
      };
    }
  }

  /**
   * Calculate pattern matching score
   */
  private async calculatePatternScore(
    transactionData: TransactionClassificationData, 
    pattern: BankWithdrawalPattern
  ): Promise<number> {
    let score = 0;
    const maxScore = 100;

    // Description pattern matching (40% weight)
    if (pattern.description_pattern && transactionData.description) {
      const descriptionScore = this.matchDescriptionPattern(
        transactionData.description, 
        pattern.description_pattern
      );
      score += descriptionScore * 0.4;
    }

    // Amount range matching (30% weight)
    if (this.isAmountInRange(transactionData.amount, pattern.amount_range_min, pattern.amount_range_max)) {
      score += 30;
    }

    // Frequency pattern matching (20% weight)
    const frequencyScore = await this.matchFrequencyPattern(
      transactionData.transaction_date, 
      pattern.frequency_pattern,
      pattern.category_id
    );
    score += frequencyScore * 0.2;

    // Base confidence from pattern (10% weight)
    score += (pattern.confidence_score / 100) * 10;

    return Math.min(score, maxScore);
  }

  /**
   * Match description against pattern using regex and keywords
   */
  private matchDescriptionPattern(description: string, pattern: string): number {
    const descLower = description.toLowerCase();
    const keywords = pattern.toLowerCase().split('|');
    
    let matches = 0;
    for (const keyword of keywords) {
      if (descLower.includes(keyword.trim())) {
        matches++;
      }
    }

    return keywords.length > 0 ? (matches / keywords.length) * 100 : 0;
  }

  /**
   * Check if amount is within range
   */
  private isAmountInRange(amount: number, min: number, max: number): boolean {
    return amount >= min && amount <= max;
  }

  /**
   * Match frequency pattern based on historical data
   */
  private async matchFrequencyPattern(
    transactionDate: string, 
    frequencyPattern: string,
    categoryId: string
  ): Promise<number> {
    try {
      // Get historical transactions for this category
      const { data: historicalData, error } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('category_id', categoryId)
        .gte('transaction_date', this.getDateRange(frequencyPattern))
        .order('transaction_date', { ascending: false });

      if (error || !historicalData || historicalData.length === 0) {
        return 50; // Neutral score if no historical data
      }

      // Analyze frequency pattern
      const dates = historicalData.map(t => new Date(t.transaction_date));
      const currentDate = new Date(transactionDate);
      
      return this.analyzeFrequencyMatch(dates, currentDate, frequencyPattern);
    } catch (error) {
      console.error('Frequency pattern matching error:', error);
      return 50; // Neutral score on error
    }
  }

  /**
   * Analyze frequency match
   */
  private analyzeFrequencyMatch(
    historicalDates: Date[], 
    currentDate: Date, 
    frequencyPattern: string
  ): number {
    if (historicalDates.length < 2) return 50;

    const intervals = [];
    for (let i = 1; i < historicalDates.length; i++) {
      const diff = historicalDates[i-1].getTime() - historicalDates[i].getTime();
      intervals.push(diff / (1000 * 60 * 60 * 24)); // Convert to days
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    const expectedIntervals = {
      'daily': 1,
      'weekly': 7,
      'monthly': 30,
      'quarterly': 90,
      'yearly': 365,
      'irregular': 0
    };

    const expected = expectedIntervals[frequencyPattern as keyof typeof expectedIntervals];
    
    if (frequencyPattern === 'irregular') {
      return 70; // Irregular patterns get moderate score
    }

    const deviation = Math.abs(avgInterval - expected) / expected;
    return Math.max(0, 100 - (deviation * 100));
  }

  /**
   * Get date range for frequency analysis
   */
  private getDateRange(frequencyPattern: string): string {
    const now = new Date();
    const ranges = {
      'daily': 30,    // Last 30 days
      'weekly': 90,   // Last 90 days
      'monthly': 365, // Last year
      'quarterly': 730, // Last 2 years
      'yearly': 1095,   // Last 3 years
      'irregular': 365  // Last year
    };

    const days = ranges[frequencyPattern as keyof typeof ranges] || 365;
    const pastDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    return pastDate.toISOString();
  }

  /**
   * Fallback classification for unmatched transactions
   */
  private async fallbackClassification(transactionData: TransactionClassificationData): Promise<ClassificationResult> {
    // Get default bank withdrawal category
    const { data: defaultCategory, error } = await supabase
      .from('transaction_categories')
      .select('id')
      .eq('name', 'Penarikan Operasional')
      .eq('type', 'expense')
      .single();

    if (error || !defaultCategory) {
      // Get any expense category as ultimate fallback
      const { data: fallbackCategory } = await supabase
        .from('transaction_categories')
        .select('id')
        .eq('type', 'expense')
        .limit(1)
        .single();

      return {
        suggested_category_id: fallbackCategory?.id || '',
        confidence_score: 30,
        classification_method: 'fallback',
        reasoning: 'Used fallback expense category',
        patterns_matched: []
      };
    }

    return {
      suggested_category_id: defaultCategory.id,
      confidence_score: 40,
      classification_method: 'fallback',
      reasoning: 'Used default operational withdrawal category',
      patterns_matched: []
    };
  }

  /**
   * Get active classification patterns
   */
  async getActivePatterns(): Promise<BankWithdrawalPattern[]> {
    const { data, error } = await supabase
      .from('bank_withdrawal_patterns')
      .select('*')
      .eq('is_active', true)
      .order('confidence_score', { ascending: false });

    if (error) {
      console.error('Error fetching patterns:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Log classification result
   */
  async logClassification(
    transactionId: string,
    classificationResult: ClassificationResult,
    classifiedBy?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('classification_logs')
        .insert({
          transaction_id: transactionId,
          suggested_category_id: classificationResult.suggested_category_id,
          confidence_score: classificationResult.confidence_score,
          classification_method: classificationResult.classification_method,
          manual_override: false,
          classified_by: classifiedBy,
          classification_data: {
            reasoning: classificationResult.reasoning,
            patterns_matched: classificationResult.patterns_matched
          }
        });

      if (error) {
        console.error('Error logging classification:', error);
      }
    } catch (error) {
      console.error('Classification logging error:', error);
    }
  }

  /**
   * Log manual override
   */
  async logManualOverride(
    transactionId: string,
    originalCategoryId: string,
    newCategoryId: string,
    reason: string,
    overriddenBy: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('classification_logs')
        .insert({
          transaction_id: transactionId,
          suggested_category_id: newCategoryId,
          confidence_score: 100,
          classification_method: 'manual_override',
          manual_override: true,
          override_reason: reason,
          classified_by: overriddenBy,
          classification_data: {
            original_category_id: originalCategoryId,
            override_reason: reason
          }
        });

      if (error) {
        console.error('Error logging manual override:', error);
      }
    } catch (error) {
      console.error('Manual override logging error:', error);
    }
  }

  /**
   * Validate bank withdrawal transaction
   */
  async validateTransaction(
    transactionData: TransactionClassificationData,
    categoryId: string
  ): Promise<ValidationResult> {
    try {
      // Get category validation rules
      const { data: category, error } = await supabase
        .from('transaction_categories')
        .select('validation_rules')
        .eq('id', categoryId)
        .single();

      if (error || !category?.validation_rules) {
        return {
          is_valid: true,
          requires_approval: false,
          validation_errors: [],
          approval_threshold_exceeded: false
        };
      }

      const rules = category.validation_rules as any;
      const errors: string[] = [];
      let requiresApproval = rules.requires_approval || false;
      let approvalThresholdExceeded = false;

      // Check amount limits
      if (rules.max_transaction_amount && transactionData.amount > rules.max_transaction_amount) {
        errors.push(`Amount exceeds maximum limit of ${rules.max_transaction_amount}`);
      }

      if (rules.max_daily_amount) {
        const dailyTotal = await this.getDailyTransactionTotal(categoryId);
        if (dailyTotal + transactionData.amount > rules.max_daily_amount) {
          errors.push(`Daily limit of ${rules.max_daily_amount} would be exceeded`);
        }
      }

      if (rules.max_monthly_amount) {
        const monthlyTotal = await this.getMonthlyTransactionTotal(categoryId);
        if (monthlyTotal + transactionData.amount > rules.max_monthly_amount) {
          errors.push(`Monthly limit of ${rules.max_monthly_amount} would be exceeded`);
        }
      }

      // Check approval threshold
      if (rules.approval_threshold && transactionData.amount >= rules.approval_threshold) {
        requiresApproval = true;
        approvalThresholdExceeded = true;
      }

      return {
        is_valid: errors.length === 0,
        requires_approval: requiresApproval,
        validation_errors: errors,
        approval_threshold_exceeded: approvalThresholdExceeded
      };
    } catch (error) {
      console.error('Validation error:', error);
      return {
        is_valid: false,
        requires_approval: true,
        validation_errors: ['Validation failed due to system error'],
        approval_threshold_exceeded: false
      };
    }
  }

  /**
   * Get daily transaction total for category
   */
  private async getDailyTransactionTotal(categoryId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('transactions')
      .select('amount')
      .eq('category_id', categoryId)
      .gte('transaction_date', today)
      .lt('transaction_date', today + 'T23:59:59.999Z');

    if (error || !data) return 0;
    
    return data.reduce((total, t) => total + t.amount, 0);
  }

  /**
   * Get monthly transaction total for category
   */
  private async getMonthlyTransactionTotal(categoryId: string): Promise<number> {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    
    const { data, error } = await supabase
      .from('transactions')
      .select('amount')
      .eq('category_id', categoryId)
      .gte('transaction_date', firstDay)
      .lte('transaction_date', lastDay);

    if (error || !data) return 0;
    
    return data.reduce((total, t) => total + t.amount, 0);
  }

  /**
   * Get classification analytics for monitoring dashboard
   */
  async getClassificationAnalytics(timeRange: '7d' | '30d' | '90d' = '30d') {
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      if (!isDatabaseAvailable() || !databaseClient) {
        throw new Error('Database connection not available')
      }

      // Get classification logs within time range
      const { data: logs, error: logsError } = await databaseClient
        .from('classification_logs')
        .select(`
          *,
          transaction_categories!suggested_category_id(name),
          actual_categories:transaction_categories!actual_category_id(name)
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (logsError) throw logsError

      // Calculate basic metrics
      const totalClassifications = logs?.length || 0
      const accurateClassifications = logs?.filter(log => 
        log.suggested_category_id === log.actual_category_id
      ).length || 0
      const manualOverrides = logs?.filter(log => log.is_manual_override).length || 0
      
      const accuracyRate = totalClassifications > 0 ? (accurateClassifications / totalClassifications) * 100 : 0
      const overrideRate = totalClassifications > 0 ? (manualOverrides / totalClassifications) * 100 : 0
      const avgConfidenceScore = logs?.length > 0 
        ? logs.reduce((sum, log) => sum + (log.confidence_score || 0), 0) / logs.length 
        : 0

      // Get daily statistics
      const dailyStats = this.calculateDailyStats(logs || [], days)

      // Get category accuracy
      const categoryAccuracy = this.calculateCategoryAccuracy(logs || [])

      // Get confidence distribution
      const confidenceDistribution = this.calculateConfidenceDistribution(logs || [])

      // Get top patterns performance
      const topPatterns = await this.getTopPatternsPerformance(startDate)

      return {
        totalClassifications,
        accurateClassifications,
        accuracyRate,
        manualOverrides,
        overrideRate,
        avgConfidenceScore,
        dailyStats,
        categoryAccuracy,
        confidenceDistribution,
        topPatterns
      }
    } catch (error) {
      console.error('Failed to get classification analytics:', error)
      throw error
    }
  }

  private calculateDailyStats(logs: any[], days: number) {
    const dailyMap = new Map()
    
    // Initialize all days with zero values
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      dailyMap.set(dateStr, {
        date: dateStr,
        classifications: 0,
        accurate: 0,
        overrides: 0,
        accuracy_rate: 0
      })
    }

    // Populate with actual data
    logs.forEach(log => {
      const dateStr = new Date(log.created_at).toISOString().split('T')[0]
      if (dailyMap.has(dateStr)) {
        const stats = dailyMap.get(dateStr)
        stats.classifications++
        if (log.suggested_category_id === log.actual_category_id) {
          stats.accurate++
        }
        if (log.is_manual_override) {
          stats.overrides++
        }
        stats.accuracy_rate = stats.classifications > 0 ? (stats.accurate / stats.classifications) * 100 : 0
      }
    })

    return Array.from(dailyMap.values()).reverse()
  }

  private calculateCategoryAccuracy(logs: any[]) {
    const categoryMap = new Map()

    logs.forEach(log => {
      const categoryName = log.transaction_categories?.name || 'Unknown'
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          category_name: categoryName,
          total_suggestions: 0,
          accurate_suggestions: 0,
          accuracy_rate: 0
        })
      }

      const stats = categoryMap.get(categoryName)
      stats.total_suggestions++
      if (log.suggested_category_id === log.actual_category_id) {
        stats.accurate_suggestions++
      }
      stats.accuracy_rate = (stats.accurate_suggestions / stats.total_suggestions) * 100
    })

    return Array.from(categoryMap.values())
      .sort((a, b) => b.total_suggestions - a.total_suggestions)
  }

  private calculateConfidenceDistribution(logs: any[]) {
    const ranges = [
      { range: '90-100%', min: 90, max: 100 },
      { range: '80-89%', min: 80, max: 89 },
      { range: '70-79%', min: 70, max: 79 },
      { range: '60-69%', min: 60, max: 69 },
      { range: '0-59%', min: 0, max: 59 }
    ]

    return ranges.map(range => {
      const logsInRange = logs.filter(log => 
        log.confidence_score >= range.min && log.confidence_score <= range.max
      )
      const accurateInRange = logsInRange.filter(log => 
        log.suggested_category_id === log.actual_category_id
      )

      return {
        range: range.range,
        count: logsInRange.length,
        accuracy_rate: logsInRange.length > 0 ? (accurateInRange.length / logsInRange.length) * 100 : 0
      }
    })
  }

  private async getTopPatternsPerformance(startDate: Date) {
    try {
      if (!isDatabaseAvailable() || !databaseClient) {
        return []
      }

      // Get pattern usage from classification logs
      const { data: logs, error } = await databaseClient
        .from('classification_logs')
        .select('pattern_matched, suggested_category_id, actual_category_id')
        .gte('created_at', startDate.toISOString())
        .not('pattern_matched', 'is', null)

      if (error) throw error

      const patternMap = new Map()

      logs?.forEach(log => {
        const pattern = log.pattern_matched
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, {
            pattern_name: pattern,
            usage_count: 0,
            accurate_count: 0,
            accuracy_rate: 0
          })
        }

        const stats = patternMap.get(pattern)
        stats.usage_count++
        if (log.suggested_category_id === log.actual_category_id) {
          stats.accurate_count++
        }
        stats.accuracy_rate = (stats.accurate_count / stats.usage_count) * 100
      })

      return Array.from(patternMap.values())
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 10)
    } catch (error) {
      console.error('Failed to get top patterns performance:', error)
      return []
    }
  }

  /**
   * Create or update classification pattern
   */
  async createPattern(patternData: Omit<BankWithdrawalPattern, 'id' | 'created_at' | 'updated_at'>): Promise<BankWithdrawalPattern | null> {
    try {
      const { data, error } = await supabase
        .from('bank_withdrawal_patterns')
        .insert(patternData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating pattern:', error);
      return null;
    }
  }

  /**
   * Update classification pattern
   */
  async updatePattern(id: string, updates: Partial<BankWithdrawalPattern>): Promise<BankWithdrawalPattern | null> {
    try {
      const { data, error } = await supabase
        .from('bank_withdrawal_patterns')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating pattern:', error);
      return null;
    }
  }

  /**
   * Delete classification pattern
   */
  async deletePattern(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bank_withdrawal_patterns')
        .delete()
        .eq('id', id);

      return !error;
    } catch (error) {
      console.error('Error deleting pattern:', error);
      return false;
    }
  }
}

// Export singleton instance
export const bankWithdrawalClassificationService = new BankWithdrawalClassificationService();
export default bankWithdrawalClassificationService;