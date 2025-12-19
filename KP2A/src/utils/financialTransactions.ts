import { supabase } from '../lib/supabase';
import { logSecurityEvent } from './scannerSecurity';

// Types for financial transactions
export interface PaymentQRData {
  amount: number;
  currency: string;
  merchant_id: string;
  merchant_name: string;
  transaction_id: string;
  description?: string;
  qr_type: 'payment';
}

export interface MemberPayment {
  member_id: string;
  member_name: string;
  amount: number;
  payment_type: 'monthly_fee' | 'loan_payment' | 'savings' | 'other';
  qr_type: 'member_payment';
  description?: string;
}

export interface TransactionResult {
  success: boolean;
  transaction_id?: string;
  error?: string;
  amount?: number;
  status?: 'completed' | 'pending' | 'failed';
}

export interface TransactionHistory {
  id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  payment_method: string;
  merchant_name?: string;
  member_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionAnalytics {
  totalTransactions: number;
  totalAmount: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageAmount: number;
  transactionsByDay: { date: string; count: number; amount: number }[];
}

// Validation functions
export const validatePaymentAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 100000000; // Max 100 million IDR
};

export const validateCurrency = (currency: string): boolean => {
  return currency === 'IDR';
};

export const validateMerchantId = (merchantId: string): boolean => {
  return /^[A-Z0-9_]{3,20}$/.test(merchantId);
};

export const validateTransactionId = (transactionId: string): boolean => {
  return /^[A-Z0-9_]{10,50}$/.test(transactionId);
};

// Process payment QR code
export const processPaymentQR = async (paymentData: PaymentQRData): Promise<TransactionResult> => {
  try {
    // Validate payment data
    if (!validatePaymentAmount(paymentData.amount)) {
      throw new Error('Invalid payment amount');
    }

    if (!validateCurrency(paymentData.currency)) {
      throw new Error('Invalid currency');
    }

    if (!validateMerchantId(paymentData.merchant_id)) {
      throw new Error('Invalid merchant ID');
    }

    if (!validateTransactionId(paymentData.transaction_id)) {
      throw new Error('Invalid transaction ID');
    }

    // Check if transaction already exists
    const { data: existingTransaction } = await supabase
      .from('financial_transactions')
      .select('id')
      .eq('transaction_id', paymentData.transaction_id)
      .single();

    if (existingTransaction) {
      throw new Error('Transaction already processed');
    }

    // Create transaction record
    const { data: transaction, error } = await supabase
      .from('financial_transactions')
      .insert({
        transaction_id: paymentData.transaction_id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: 'pending',
        payment_method: 'qr_scan',
        merchant_id: paymentData.merchant_id,
        merchant_name: paymentData.merchant_name,
        description: paymentData.description,
        metadata: {
          qr_type: paymentData.qr_type,
          processed_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Simulate payment gateway processing
    const paymentSuccess = await mockPaymentGateway(paymentData);

    // Update transaction status
    const finalStatus = paymentSuccess ? 'completed' : 'failed';
    await supabase
      .from('financial_transactions')
      .update({ status: finalStatus })
      .eq('id', transaction.id);

    // Log security event
    logSecurityEvent({
      event_type: 'payment_processed',
      severity: paymentSuccess ? 'info' : 'warning',
      user_id: 'system',
      scan_data: `Payment ${paymentData.transaction_id}`,
      scanner_mode: 'payment',
      ip_address: '127.0.0.1',
      user_agent: 'Scanner System',
      timestamp: new Date().toISOString(),
      metadata: {
        amount: paymentData.amount,
        merchant_id: paymentData.merchant_id,
        status: finalStatus
      }
    });

    return {
      success: paymentSuccess,
      transaction_id: paymentData.transaction_id,
      amount: paymentData.amount,
      status: finalStatus
    };

  } catch (error) {
    // Log error
    logSecurityEvent({
      event_type: 'payment_error',
      severity: 'error',
      user_id: 'system',
      scan_data: 'Payment processing failed',
      scanner_mode: 'payment',
      ip_address: '127.0.0.1',
      user_agent: 'Scanner System',
      timestamp: new Date().toISOString(),
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment processing failed'
    };
  }
};

// Process member payment QR code
export const processMemberPayment = async (memberPayment: MemberPayment): Promise<TransactionResult> => {
  try {
    // Validate member payment data
    if (!validatePaymentAmount(memberPayment.amount)) {
      throw new Error('Invalid payment amount');
    }

    if (!memberPayment.member_id || memberPayment.member_id.length < 3) {
      throw new Error('Invalid member ID');
    }

    // Generate transaction ID for member payment
    const transactionId = `MBR_${memberPayment.member_id}_${Date.now()}`;

    // Create member payment record
    const { data: payment, error } = await supabase
      .from('member_payments')
      .insert({
        member_id: memberPayment.member_id,
        member_name: memberPayment.member_name,
        amount: memberPayment.amount,
        payment_type: memberPayment.payment_type,
        transaction_id: transactionId,
        status: 'pending',
        description: memberPayment.description,
        metadata: {
          qr_type: memberPayment.qr_type,
          processed_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Also create a financial transaction record
    await supabase
      .from('financial_transactions')
      .insert({
        transaction_id: transactionId,
        amount: memberPayment.amount,
        currency: 'IDR',
        status: 'completed', // Member payments are typically auto-approved
        payment_method: 'member_qr_scan',
        member_id: memberPayment.member_id,
        merchant_name: 'KP2A Cimahi',
        description: `${memberPayment.payment_type} - ${memberPayment.member_name}`,
        metadata: {
          qr_type: memberPayment.qr_type,
          payment_type: memberPayment.payment_type
        }
      });

    // Update member payment status
    await supabase
      .from('member_payments')
      .update({ status: 'completed' })
      .eq('id', payment.id);

    // Log security event
    logSecurityEvent({
      event_type: 'member_payment_processed',
      severity: 'info',
      user_id: memberPayment.member_id,
      scan_data: `Member payment ${transactionId}`,
      scanner_mode: 'member_payment',
      ip_address: '127.0.0.1',
      user_agent: 'Scanner System',
      timestamp: new Date().toISOString(),
      metadata: {
        amount: memberPayment.amount,
        payment_type: memberPayment.payment_type,
        member_name: memberPayment.member_name
      }
    });

    return {
      success: true,
      transaction_id: transactionId,
      amount: memberPayment.amount,
      status: 'completed'
    };

  } catch (error) {
    // Log error
    logSecurityEvent({
      event_type: 'member_payment_error',
      severity: 'error',
      user_id: memberPayment.member_id || 'unknown',
      scan_data: 'Member payment processing failed',
      scanner_mode: 'member_payment',
      ip_address: '127.0.0.1',
      user_agent: 'Scanner System',
      timestamp: new Date().toISOString(),
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Member payment processing failed'
    };
  }
};

// Get transaction history
export const getTransactionHistory = async (limit: number = 50): Promise<TransactionHistory[]> => {
  try {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
};

// Get transaction analytics
export const getTransactionAnalytics = async (): Promise<TransactionAnalytics> => {
  try {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*');

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const transactions = data || [];
    
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const successfulTransactions = transactions.filter(t => t.status === 'completed').length;
    const failedTransactions = transactions.filter(t => t.status === 'failed').length;
    const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

    // Calculate transactions by day for the last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTransactions = transactions.filter(t => 
        t.created_at.split('T')[0] === dateStr
      );
      
      last7Days.push({
        date: dateStr,
        count: dayTransactions.length,
        amount: dayTransactions.reduce((sum, t) => sum + t.amount, 0)
      });
    }

    return {
      totalTransactions,
      totalAmount,
      successfulTransactions,
      failedTransactions,
      averageAmount,
      transactionsByDay: last7Days
    };
  } catch (error) {
    console.error('Error fetching transaction analytics:', error);
    return {
      totalTransactions: 0,
      totalAmount: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      averageAmount: 0,
      transactionsByDay: []
    };
  }
};

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Generate QR code data for payments
export const generatePaymentQR = (paymentData: Omit<PaymentQRData, 'qr_type'>): string => {
  const qrData: PaymentQRData = {
    ...paymentData,
    qr_type: 'payment'
  };
  return JSON.stringify(qrData);
};

// Generate QR code data for member payments
export const generateMemberPaymentQR = (memberPayment: Omit<MemberPayment, 'qr_type'>): string => {
  const qrData: MemberPayment = {
    ...memberPayment,
    qr_type: 'member_payment'
  };
  return JSON.stringify(qrData);
};

// Mock payment gateway (replace with real implementation)
const mockPaymentGateway = async (paymentData: PaymentQRData): Promise<boolean> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate 95% success rate
  return Math.random() > 0.05;
};