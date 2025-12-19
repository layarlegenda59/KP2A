import { forceDeleteTransaction, getTransactionDetails, getAllTransactions } from './adminDelete.js';

/**
 * Test delete functionality with comprehensive logging
 */
export async function testDeleteFunctionality() {
  console.log('🧪 STARTING DELETE FUNCTIONALITY TEST');
  
  try {
    // Step 1: Get all transactions to see what's available
    console.log('📋 Step 1: Getting all transactions...');
    const allTransactions = await getAllTransactions();
    
    if (allTransactions.error) {
      console.error('❌ Failed to get transactions:', allTransactions.error);
      return { success: false, error: allTransactions.error };
    }
    
    console.log('✅ Found transactions:', allTransactions.data?.length || 0);
    
    if (!allTransactions.data || allTransactions.data.length === 0) {
      console.log('⚠️ No transactions found to test delete');
      return { success: true, message: 'No transactions to test' };
    }
    
    // Step 2: Pick the first transaction for testing
    const testTransaction = allTransactions.data[0];
    console.log('🎯 Step 2: Selected transaction for testing:', testTransaction);
    
    // Step 3: Get detailed info about the transaction
    console.log('🔍 Step 3: Getting transaction details...');
    const details = await getTransactionDetails(testTransaction.id);
    
    if (details.error) {
      console.error('❌ Failed to get transaction details:', details.error);
      return { success: false, error: details.error };
    }
    
    console.log('✅ Transaction details:', details.data);
    
    // Step 4: Test force delete
    console.log('🗑️ Step 4: Testing force delete...');
    const deleteResult = await forceDeleteTransaction(testTransaction.id, {
      id: 'test-user',
      email: 'test@example.com',
      role: 'admin'
    });
    
    if (deleteResult.success) {
      console.log('✅ Force delete successful!');
      
      // Step 5: Verify deletion
      console.log('🔍 Step 5: Verifying deletion...');
      const verifyResult = await getTransactionDetails(testTransaction.id);
      
      if (verifyResult.error) {
        console.log('✅ Verification successful - transaction not found (as expected)');
        return { 
          success: true, 
          message: 'Delete test completed successfully',
          deletedTransactionId: testTransaction.id
        };
      } else {
        console.error('❌ Verification failed - transaction still exists');
        return { 
          success: false, 
          error: 'Transaction still exists after delete'
        };
      }
    } else {
      console.error('❌ Force delete failed:', deleteResult.error);
      return { success: false, error: deleteResult.error };
    }
    
  } catch (error) {
    console.error('💥 Test failed with exception:', error);
    return { success: false, error: error.message };
  }
}

// Auto-run test when this module is imported in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  console.log('🚀 Auto-running delete test in development mode...');
  setTimeout(() => {
    testDeleteFunctionality().then