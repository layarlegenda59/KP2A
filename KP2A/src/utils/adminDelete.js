import { supabaseAdmin } from '../lib/supabase-admin';

// Use singleton admin client to prevent multiple GoTrueClient instances
const supabaseServiceRole = supabaseAdmin;

/**
 * Force delete transaction using service role (bypasses RLS)
 * @param {string} transactionId - ID of transaction to delete
 * @param {object} userInfo - Current user information for logging
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function forceDeleteTransaction(transactionId, userInfo = {}) {
  console.log('🔥 FORCE DELETE - Starting with service role', {
    transactionId,
    userInfo,
    timestamp: new Date().toISOString(),
    serviceRoleConfigured: !!supabaseServiceRole,
    serviceRoleUrl: supabaseServiceRole?.supabaseUrl
  });

  try {
    // Step 1: Check if transaction exists
    console.log('🔍 FORCE DELETE - Checking transaction existence');
    const { data: existingTransaction, error: checkError } = await supabaseServiceRole
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (checkError) {
      console.error('❌ FORCE DELETE - Error checking transaction:', checkError);
      return {
        success: false,
        error: `Error checking transaction: ${checkError.message}`
      };
    }

    if (!existingTransaction) {
      console.log('⚠️ FORCE DELETE - Transaction not found');
      return {
        success: false,
        error: 'Transaction not found'
      };
    }

    console.log('✅ FORCE DELETE - Transaction found:', existingTransaction);

    // Step 2: Force delete using service role
    console.log('🗑️ FORCE DELETE - Executing delete with service role');
    const { data: deleteResult, error: deleteError } = await supabaseServiceRole
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .select();

    if (deleteError) {
      console.error('❌ FORCE DELETE - Delete error:', deleteError);
      return {
        success: false,
        error: `Delete failed: ${deleteError.message}`
      };
    }

    console.log('✅ FORCE DELETE - Delete successful:', deleteResult);

    // Step 3: Verify deletion
    const { data: verifyData, error: verifyError } = await supabaseServiceRole
      .from('transactions')
      .select('id')
      .eq('id', transactionId);

    if (verifyError) {
      console.error('❌ FORCE DELETE - Verification error:', verifyError);
    } else {
      console.log('🔍 FORCE DELETE - Verification result:', {
        found: verifyData?.length || 0,
        shouldBeZero: true
      });
    }

    return {
      success: true,
      data: deleteResult
    };

  } catch (error) {
    console.error('💥 FORCE DELETE - Unexpected error:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Get detailed transaction info using service role
 * @param {string} transactionId - ID of transaction to check
 * @returns {Promise<object>}
 */
export async function getTransactionDetails(transactionId) {
  console.log('🔍 Getting transaction details with service role:', transactionId);
  
  try {
    const { data, error } = await supabaseServiceRole
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error) {
      console.error('❌ Error getting transaction details:', error);
      return { error: error.message };
    }

    console.log('✅ Transaction details:', data);
    return { data };

  } catch (error) {
    console.error('💥 Unexpected error getting transaction details:', error);
    return { error: error.message };
  }
}

/**
 * List all transactions using service role (for debugging)
 * @returns {Promise<object>}
 */
export async function getAllTransactions() {
  console.log('📋 Getting all transactions with service role');
  
  try {
    const { data, error } = await supabaseServiceRole
      .from('transactions')
      .select('id, title, amount, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error getting all transactions:', error);
      return { error: error.message };
    }

    console.log('✅ All transactions (last 10):', data);
    return { data };

  } catch (error) {
    console.error('💥 Unexpected error getting all transactions:', error);
    return { error: error.message };
  }
}