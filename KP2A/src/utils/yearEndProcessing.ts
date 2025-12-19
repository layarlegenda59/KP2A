import { databaseClient, isDatabaseAvailable } from '../lib/database'
import { Loan } from '../types'
import toast from 'react-hot-toast'

/**
 * Utility functions for year-end processing and financial reporting
 * Handles loans with 'belum_lunas' status for next year's accounting
 */

export interface YearEndSummary {
  totalOutstandingLoans: number
  totalUnpaidAmount: number
  loansCarriedForward: Loan[]
  year: number
}

/**
 * Get all loans with 'belum_lunas' status for year-end processing
 */
export const getUnpaidLoansForYearEnd = async (year: number): Promise<Loan[]> => {
  try {
    if (!isDatabaseAvailable()) {
      throw new Error('Database tidak tersedia')
    }

    const { data, error } = await databaseClient
      .from('loans')
      .select(`
        *,
        member:members(id, nama_lengkap)
      `)
      .eq('status', 'belum_lunas')
      .gte('tanggal_pinjaman', `${year}-01-01`)
      .lte('tanggal_pinjaman', `${year}-12-31`)
      .order('tanggal_pinjaman', { ascending: true })

    if (error) {
      console.error('Error fetching unpaid loans:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Failed to get unpaid loans for year-end:', error)
    throw error
  }
}

/**
 * Calculate year-end summary for loans with 'belum_lunas' status
 */
export const calculateYearEndSummary = async (year: number): Promise<YearEndSummary> => {
  try {
    const unpaidLoans = await getUnpaidLoansForYearEnd(year)
    
    const totalOutstandingLoans = unpaidLoans.length
    const totalUnpaidAmount = unpaidLoans.reduce((sum, loan) => {
      return sum + (loan.sisa_pinjaman || loan.jumlah_pinjaman || 0)
    }, 0)

    return {
      totalOutstandingLoans,
      totalUnpaidAmount,
      loansCarriedForward: unpaidLoans,
      year
    }
  } catch (error) {
    console.error('Failed to calculate year-end summary:', error)
    throw error
  }
}

/**
 * Generate year-end financial report including 'belum_lunas' loans
 */
export const generateYearEndFinancialReport = async (year: number) => {
  try {
    if (!isDatabaseAvailable()) {
      throw new Error('Database tidak tersedia')
    }

    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    // Get regular financial data
    const [duesData, loanPaymentsData, expensesData, yearEndSummary] = await Promise.all([
      // Dues income
      databaseClient
        .from('dues')
        .select('iuran_wajib, iuran_sukarela, simpanan_wajib')
        .gte('tanggal_bayar', startDate)
        .lte('tanggal_bayar', endDate)
        .eq('status', 'lunas'),
      
      // Loan payments income
      databaseClient
        .from('loan_payments')
        .select('total_angsuran')
        .gte('tanggal_bayar', startDate)
        .lte('tanggal_bayar', endDate),
      
      // Expenses
      databaseClient
        .from('expenses')
        .select('amount')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .eq('status', 'paid'),
      
      // Year-end summary for unpaid loans
      calculateYearEndSummary(year)
    ])

    // Calculate totals
    const totalDues = duesData.data?.reduce((sum, item) => 
      sum + (item.iuran_wajib || 0) + (item.iuran_sukarela || 0) + (item.simpanan_wajib || 0), 0
    ) || 0
    
    const totalLoanPayments = loanPaymentsData.data?.reduce((sum, item) => 
      sum + (item.total_angsuran || 0), 0
    ) || 0
    
    const totalExpenses = expensesData.data?.reduce((sum, item) => 
      sum + (item.amount || 0), 0
    ) || 0

    const totalIncome = totalDues + totalLoanPayments
    const netIncome = totalIncome - totalExpenses

    // Create comprehensive year-end report
    const reportData = {
      periode_start: startDate,
      periode_end: endDate,
      tipe_laporan: 'tahunan' as const,
      total_pemasukan: totalIncome,
      total_pengeluaran: totalExpenses,
      saldo_akhir: netIncome,
      // Additional year-end specific data
      year_end_data: {
        outstanding_loans_count: yearEndSummary.totalOutstandingLoans,
        outstanding_loans_amount: yearEndSummary.totalUnpaidAmount,
        carried_forward_loans: yearEndSummary.loansCarriedForward.map(loan => ({
          id: loan.id,
          member_name: loan.member?.nama_lengkap || 'Unknown',
          amount: loan.jumlah_pinjaman,
          remaining: loan.sisa_pinjaman || loan.jumlah_pinjaman,
          loan_date: loan.tanggal_pinjaman
        }))
      }
    }

    // Save to financial_reports table
    const { data: savedReport, error: saveError } = await databaseClient
      .from('financial_reports')
      .insert({
        periode_start: reportData.periode_start,
        periode_end: reportData.periode_end,
        tipe_laporan: reportData.tipe_laporan,
        total_pemasukan: reportData.total_pemasukan,
        total_pengeluaran: reportData.total_pengeluaran,
        saldo_akhir: reportData.saldo_akhir
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving year-end report:', saveError)
      throw saveError
    }

    return {
      report: savedReport,
      yearEndSummary,
      detailedData: reportData
    }
  } catch (error) {
    console.error('Failed to generate year-end financial report:', error)
    throw error
  }
}

/**
 * Update loan status from 'belum_lunas' to 'aktif' for new year processing
 * This should be called at the beginning of a new year
 */
export const processNewYearLoanStatus = async (previousYear: number) => {
  try {
    if (!isDatabaseAvailable()) {
      throw new Error('Database tidak tersedia')
    }

    // Get all loans with 'belum_lunas' status from previous year
    const { data: unpaidLoans, error: fetchError } = await databaseClient
      .from('loans')
      .select('id')
      .eq('status', 'belum_lunas')
      .gte('tanggal_pinjaman', `${previousYear}-01-01`)
      .lte('tanggal_pinjaman', `${previousYear}-12-31`)

    if (fetchError) {
      console.error('Error fetching unpaid loans:', fetchError)
      throw fetchError
    }

    if (!unpaidLoans || unpaidLoans.length === 0) {
      return { updated: 0, message: 'Tidak ada pinjaman belum lunas dari tahun sebelumnya' }
    }

    // Update status to 'aktif' for continued processing in new year
    const { error: updateError } = await databaseClient
      .from('loans')
      .update({ status: 'aktif' })
      .in('id', unpaidLoans.map(loan => loan.id))

    if (updateError) {
      console.error('Error updating loan status:', updateError)
      throw updateError
    }

    return {
      updated: unpaidLoans.length,
      message: `${unpaidLoans.length} pinjaman berhasil diperbarui statusnya untuk tahun baru`
    }
  } catch (error) {
    console.error('Failed to process new year loan status:', error)
    throw error
  }
}

/**
 * Get financial impact of 'belum_lunas' loans for reporting
 */
export const getUnpaidLoansFinancialImpact = async (year: number) => {
  try {
    const yearEndSummary = await calculateYearEndSummary(year)
    
    return {
      impact_on_cash_flow: {
        expected_income_not_received: yearEndSummary.totalUnpaidAmount,
        loans_count: yearEndSummary.totalOutstandingLoans
      },
      recommendations: [
        'Lakukan follow-up intensif untuk pinjaman yang belum lunas',
        'Pertimbangkan restrukturisasi pinjaman jika diperlukan',
        'Evaluasi kebijakan pemberian pinjaman untuk tahun berikutnya',
        'Siapkan cadangan untuk potensi kerugian piutang'
      ],
      next_year_actions: [
        'Pindahkan status pinjaman dari "belum_lunas" ke "aktif"',
        'Buat jadwal pembayaran ulang untuk tahun baru',
        'Lakukan komunikasi dengan anggota terkait pinjaman yang tertunda'
      ]
    }
  } catch (error) {
    console.error('Failed to get financial impact:', error)
    throw error
  }
}