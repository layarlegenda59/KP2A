import { isDatabaseAvailable, databaseClient } from '../lib/database'

export interface BankWithdrawalValidationRule {
  id: string
  rule_name: string
  rule_type: 'amount_limit' | 'frequency_limit' | 'pattern_match' | 'business_rule'
  conditions: {
    min_amount?: number
    max_amount?: number
    max_frequency_per_day?: number
    max_frequency_per_month?: number
    required_patterns?: string[]
    forbidden_patterns?: string[]
    business_hours_only?: boolean
    require_approval_above?: number
  }
  error_message: string
  warning_message?: string
  is_active: boolean
  severity: 'error' | 'warning' | 'info'
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  requiresApproval: boolean
  approvalReason?: string
}

export interface ValidationError {
  rule_id: string
  rule_name: string
  message: string
  field?: string
  severity: 'error'
}

export interface ValidationWarning {
  rule_id: string
  rule_name: string
  message: string
  field?: string
  severity: 'warning' | 'info'
}

export interface TransactionValidationData {
  amount: number
  description: string
  payment_method_id: string
  category_id: string
  transaction_date: string
  user_id?: string
  bank_account?: string
}

class BankWithdrawalValidationService {
  private validationRules: BankWithdrawalValidationRule[] = []
  private rulesLoaded = false

  /**
   * Load validation rules from database
   */
  async loadValidationRules(): Promise<void> {
    try {
      if (!isDatabaseAvailable() || !databaseClient) {
        // Use default rules if database is not available
        this.validationRules = this.getDefaultValidationRules()
        this.rulesLoaded = true
        return
      }

      const { data, error } = await databaseClient
        .from('transaction_categories')
        .select('validation_rules')
        .eq('type', 'expense')
        .not('validation_rules', 'is', null)

      if (error) throw error

      // Extract validation rules from categories
      const rules: BankWithdrawalValidationRule[] = []
      data?.forEach((category, index) => {
        if (category.validation_rules) {
          const categoryRules = Array.isArray(category.validation_rules) 
            ? category.validation_rules 
            : [category.validation_rules]
          
          categoryRules.forEach((rule: any, ruleIndex: number) => {
            rules.push({
              id: `${index}-${ruleIndex}`,
              rule_name: rule.rule_name || `Rule ${index}-${ruleIndex}`,
              rule_type: rule.rule_type || 'business_rule',
              conditions: rule.conditions || {},
              error_message: rule.error_message || 'Validation failed',
              warning_message: rule.warning_message,
              is_active: rule.is_active !== false,
              severity: rule.severity || 'error'
            })
          })
        }
      })

      this.validationRules = [...rules, ...this.getDefaultValidationRules()]
      this.rulesLoaded = true
    } catch (error) {
      console.error('Failed to load validation rules:', error)
      this.validationRules = this.getDefaultValidationRules()
      this.rulesLoaded = true
    }
  }

  /**
   * Get default validation rules
   */
  private getDefaultValidationRules(): BankWithdrawalValidationRule[] {
    return [
      {
        id: 'amount-min',
        rule_name: 'Minimum Amount',
        rule_type: 'amount_limit',
        conditions: { min_amount: 1000 },
        error_message: 'Jumlah penarikan minimal Rp 1.000',
        is_active: true,
        severity: 'error'
      },
      {
        id: 'amount-max-daily',
        rule_name: 'Daily Amount Limit',
        rule_type: 'amount_limit',
        conditions: { max_amount: 50000000 },
        error_message: 'Jumlah penarikan harian maksimal Rp 50.000.000',
        warning_message: 'Penarikan besar, pastikan sudah sesuai prosedur',
        is_active: true,
        severity: 'error'
      },
      {
        id: 'frequency-daily',
        rule_name: 'Daily Frequency Limit',
        rule_type: 'frequency_limit',
        conditions: { max_frequency_per_day: 10 },
        error_message: 'Maksimal 10 transaksi penarikan per hari',
        is_active: true,
        severity: 'error'
      },
      {
        id: 'business-hours',
        rule_name: 'Business Hours Only',
        rule_type: 'business_rule',
        conditions: { business_hours_only: true },
        warning_message: 'Transaksi di luar jam kerja, pastikan sudah mendapat persetujuan',
        is_active: true,
        severity: 'warning'
      },
      {
        id: 'large-amount-approval',
        rule_name: 'Large Amount Approval',
        rule_type: 'business_rule',
        conditions: { require_approval_above: 10000000 },
        warning_message: 'Transaksi di atas Rp 10.000.000 memerlukan persetujuan khusus',
        is_active: true,
        severity: 'warning'
      },
      {
        id: 'description-required',
        rule_name: 'Description Required',
        rule_type: 'pattern_match',
        conditions: { required_patterns: ['.{10,}'] },
        error_message: 'Deskripsi harus minimal 10 karakter untuk penarikan bank',
        is_active: true,
        severity: 'error'
      },
      {
        id: 'suspicious-patterns',
        rule_name: 'Suspicious Patterns',
        rule_type: 'pattern_match',
        conditions: { 
          forbidden_patterns: [
            'test', 'testing', 'coba', 'dummy', 'fake',
            'pinjam', 'hutang', 'utang', 'bon'
          ]
        },
        warning_message: 'Deskripsi mengandung kata yang mencurigakan, harap periksa kembali',
        is_active: true,
        severity: 'warning'
      }
    ]
  }

  /**
   * Validate bank withdrawal transaction
   */
  async validateTransaction(data: TransactionValidationData): Promise<ValidationResult> {
    if (!this.rulesLoaded) {
      await this.loadValidationRules()
    }

    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    let requiresApproval = false
    let approvalReason = ''

    // Check if it's a bank transfer
    const isBankTransfer = await this.isBankTransferPayment(data.payment_method_id)
    if (!isBankTransfer) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        requiresApproval: false
      }
    }

    // Apply validation rules
    for (const rule of this.validationRules) {
      if (!rule.is_active) continue

      const result = await this.applyRule(rule, data)
      
      if (result.violated) {
        if (rule.severity === 'error') {
          errors.push({
            rule_id: rule.id,
            rule_name: rule.rule_name,
            message: rule.error_message,
            field: result.field,
            severity: 'error'
          })
        } else {
          warnings.push({
            rule_id: rule.id,
            rule_name: rule.rule_name,
            message: rule.warning_message || rule.error_message,
            field: result.field,
            severity: rule.severity as 'warning' | 'info'
          })
        }

        if (result.requiresApproval) {
          requiresApproval = true
          approvalReason = rule.rule_name
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiresApproval,
      approvalReason
    }
  }

  /**
   * Apply a single validation rule
   */
  private async applyRule(rule: BankWithdrawalValidationRule, data: TransactionValidationData): Promise<{
    violated: boolean
    field?: string
    requiresApproval?: boolean
  }> {
    const { conditions } = rule

    switch (rule.rule_type) {
      case 'amount_limit':
        return this.validateAmountLimits(conditions, data)

      case 'frequency_limit':
        return await this.validateFrequencyLimits(conditions, data)

      case 'pattern_match':
        return this.validatePatterns(conditions, data)

      case 'business_rule':
        return this.validateBusinessRules(conditions, data)

      default:
        return { violated: false }
    }
  }

  /**
   * Validate amount limits
   */
  private validateAmountLimits(conditions: any, data: TransactionValidationData) {
    if (conditions.min_amount && data.amount < conditions.min_amount) {
      return { violated: true, field: 'amount' }
    }

    if (conditions.max_amount && data.amount > conditions.max_amount) {
      return { violated: true, field: 'amount' }
    }

    return { violated: false }
  }

  /**
   * Validate frequency limits
   */
  private async validateFrequencyLimits(conditions: any, data: TransactionValidationData) {
    try {
      if (!isDatabaseAvailable() || !databaseClient) {
        return { violated: false }
      }

      const today = new Date(data.transaction_date)
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

      // Check daily frequency
      if (conditions.max_frequency_per_day) {
        const { count: dailyCount } = await databaseClient
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('transaction_type', 'expense')
          .eq('payment_method_id', data.payment_method_id)
          .gte('transaction_date', startOfDay.toISOString())
          .lte('transaction_date', endOfDay.toISOString())

        if ((dailyCount || 0) >= conditions.max_frequency_per_day) {
          return { violated: true, field: 'frequency' }
        }
      }

      // Check monthly frequency
      if (conditions.max_frequency_per_month) {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

        const { count: monthlyCount } = await databaseClient
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('transaction_type', 'expense')
          .eq('payment_method_id', data.payment_method_id)
          .gte('transaction_date', startOfMonth.toISOString())
          .lte('transaction_date', endOfMonth.toISOString())

        if ((monthlyCount || 0) >= conditions.max_frequency_per_month) {
          return { violated: true, field: 'frequency' }
        }
      }

      return { violated: false }
    } catch (error) {
      console.error('Frequency validation error:', error)
      return { violated: false }
    }
  }

  /**
   * Validate patterns in description
   */
  private validatePatterns(conditions: any, data: TransactionValidationData) {
    const description = data.description.toLowerCase()

    // Check required patterns
    if (conditions.required_patterns) {
      for (const pattern of conditions.required_patterns) {
        const regex = new RegExp(pattern, 'i')
        if (!regex.test(data.description)) {
          return { violated: true, field: 'description' }
        }
      }
    }

    // Check forbidden patterns
    if (conditions.forbidden_patterns) {
      for (const pattern of conditions.forbidden_patterns) {
        if (description.includes(pattern.toLowerCase())) {
          return { violated: true, field: 'description' }
        }
      }
    }

    return { violated: false }
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(conditions: any, data: TransactionValidationData) {
    // Check business hours
    if (conditions.business_hours_only) {
      const transactionTime = new Date(data.transaction_date)
      const hour = transactionTime.getHours()
      const isWeekend = transactionTime.getDay() === 0 || transactionTime.getDay() === 6

      if (isWeekend || hour < 8 || hour > 17) {
        return { violated: true, field: 'transaction_date' }
      }
    }

    // Check approval requirements
    if (conditions.require_approval_above && data.amount > conditions.require_approval_above) {
      return { violated: true, requiresApproval: true, field: 'amount' }
    }

    return { violated: false }
  }

  /**
   * Check if payment method is bank transfer
   */
  private async isBankTransferPayment(paymentMethodId: string): Promise<boolean> {
    try {
      if (!isDatabaseAvailable() || !databaseClient) {
        return false
      }

      const { data, error } = await databaseClient
        .from('payment_methods')
        .select('type')
        .eq('id', paymentMethodId)
        .single()

      if (error) return false

      return data?.type === 'bank_transfer'
    } catch (error) {
      console.error('Payment method check error:', error)
      return false
    }
  }

  /**
   * Get validation rules for display
   */
  async getValidationRules(): Promise<BankWithdrawalValidationRule[]> {
    if (!this.rulesLoaded) {
      await this.loadValidationRules()
    }
    return this.validationRules.filter(rule => rule.is_active)
  }

  /**
   * Update validation rule
   */
  async updateValidationRule(ruleId: string, updates: Partial<BankWithdrawalValidationRule>): Promise<void> {
    const ruleIndex = this.validationRules.findIndex(rule => rule.id === ruleId)
    if (ruleIndex !== -1) {
      this.validationRules[ruleIndex] = { ...this.validationRules[ruleIndex], ...updates }
    }
  }

  /**
   * Add new validation rule
   */
  async addValidationRule(rule: Omit<BankWithdrawalValidationRule, 'id'>): Promise<void> {
    const newRule: BankWithdrawalValidationRule = {
      ...rule,
      id: `custom-${Date.now()}`
    }
    this.validationRules.push(newRule)
  }

  /**
   * Remove validation rule
   */
  async removeValidationRule(ruleId: string): Promise<void> {
    this.validationRules = this.validationRules.filter(rule => rule.id !== ruleId)
  }
}

export const bankWithdrawalValidationService = new BankWithdrawalValidationService()