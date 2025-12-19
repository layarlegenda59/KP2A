const { createClient } = require('@supabase/supabase-js');

/**
 * Member Validation Service
 * Handles member validation against Supabase database with Indonesian phone number normalization
 * Following patterns from the original Google Sheets bot implementation
 */
class MemberValidationService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Normalize Indonesian phone number to international format
     * @param {string} phoneNumber - Raw phone number input
     * @returns {string} - Normalized phone number in international format (62xxx)
     */
    normalizePhoneNumber(phoneNumber) {
        if (!phoneNumber) return null;
        
        // Remove all non-digit characters
        let cleaned = phoneNumber.replace(/\D/g, '');
        
        // Handle different Indonesian phone number formats
        if (cleaned.startsWith('62')) {
            // Already in international format (62xxx)
            return cleaned;
        } else if (cleaned.startsWith('0')) {
            // Local format (08xxx) -> convert to international (628xxx)
            return '62' + cleaned.substring(1);
        } else if (cleaned.startsWith('8')) {
            // Without leading 0 (8xxx) -> convert to international (628xxx)
            return '62' + cleaned;
        } else if (cleaned.startsWith('+62')) {
            // With country code prefix (+62xxx)
            return cleaned.substring(1);
        }
        
        // If none of the above patterns match, assume it's already correct
        return cleaned;
    }

    /**
     * Validate member by phone number
     * @param {string} phoneNumber - Phone number to validate
     * @returns {Object} - Validation result with member data or null
     */
    async validateMemberByPhone(phoneNumber) {
        try {
            const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
            
            if (!normalizedPhone) {
                return {
                    isValid: false,
                    member: null,
                    error: 'Invalid phone number format'
                };
            }

            // Query members table with normalized phone number
            // Try multiple phone number variations to increase match probability
            const phoneVariations = [
                normalizedPhone,
                normalizedPhone.startsWith('62') ? '0' + normalizedPhone.substring(2) : normalizedPhone,
                normalizedPhone.startsWith('62') ? normalizedPhone.substring(2) : normalizedPhone
            ];

            const { data: members, error } = await this.supabase
                .from('members')
                .select(`
                    id,
                    nama_lengkap,
                    no_hp,
                    nik,
                    alamat,
                    id_anggota,
                    status_keanggotaan,
                    tanggal_masuk,
                    jabatan,
                    created_at,
                    updated_at
                `)
                .or(phoneVariations.map(phone => `no_hp.eq.${phone}`).join(','))
                .eq('status_keanggotaan', 'aktif')
                .limit(1);

            if (error) {
                console.error('Error validating member:', error);
                return {
                    isValid: false,
                    member: null,
                    error: 'Database error during validation'
                };
            }

            if (!members || members.length === 0) {
                return {
                    isValid: false,
                    member: null,
                    error: 'Member not found'
                };
            }

            const member = members[0];

            // Get member's financial data (dues and loans)
            const [duesResult, loansResult] = await Promise.all([
                this.getMemberDues(member.id),
                this.getMemberLoans(member.id)
            ]);

            return {
                isValid: true,
                member: {
                    ...member,
                    phone: member.no_hp, // Add phone field for compatibility
                    name: member.nama_lengkap, // Add name field for compatibility
                    member_number: member.id_anggota, // Add member_number field for compatibility
                    dues: duesResult.dues || [],
                    totalDues: duesResult.total || 0,
                    loans: loansResult.loans || [],
                    totalLoans: loansResult.total || 0,
                    activeLoans: loansResult.active || 0
                },
                error: null
            };

        } catch (error) {
            console.error('Error in validateMemberByPhone:', error);
            return {
                isValid: false,
                member: null,
                error: 'Unexpected error during validation'
            };
        }
    }

    /**
     * Validate member by phone number (alias for validateMemberByPhone)
     * @param {string} phoneNumber - Phone number to validate
     * @returns {Object} - Validation result with member data or null
     */
    async validateMember(phoneNumber) {
        return await this.validateMemberByPhone(phoneNumber);
    }

    /**
     * Get member profile by member ID
     * @param {string} memberId - Member ID
     * @returns {Object} - Member profile information
     */
    async getMemberProfile(memberId) {
        try {
            const { data: member, error } = await this.supabase
                .from('members')
                .select(`
                    id,
                    nama_lengkap,
                    no_hp,
                    nik,
                    alamat,
                    id_anggota,
                    status_keanggotaan,
                    tanggal_masuk,
                    jabatan,
                    created_at,
                    updated_at
                `)
                .eq('id', memberId)
                .single();

            if (error) {
                console.error('Error fetching member profile:', error);
                return null;
            }

            return member;
        } catch (error) {
            console.error('Error in getMemberProfile:', error);
            return null;
        }
    }

    /**
     * Get member activity summary
     * @param {string} memberId - Member ID
     * @param {number} months - Number of months to look back
     * @returns {Object} - Activity summary
     */
    async getMemberActivity(memberId, months = 6) {
        try {
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);

            // Get recent dues
            const { data: recentDues } = await this.supabase
                .from('dues')
                .select('*')
                .eq('member_id', memberId)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false });

            // Get recent loans
            const { data: recentLoans } = await this.supabase
                .from('loans')
                .select('*')
                .eq('member_id', memberId)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false });

            return {
                period_months: months,
                recent_dues: recentDues || [],
                recent_loans: recentLoans || [],
                total_dues_paid: recentDues?.filter(d => d.status === 'paid').length || 0,
                total_loans_taken: recentLoans?.length || 0
            };
        } catch (error) {
            console.error('Error in getMemberActivity:', error);
            return {
                period_months: months,
                recent_dues: [],
                recent_loans: [],
                total_dues_paid: 0,
                total_loans_taken: 0
            };
        }
    }

    /**
     * Get member's dues information
     * @param {string} memberId - Member ID
     * @returns {Object} - Dues information
     */
    async getMemberDues(memberId) {
        try {
            const { data: dues, error } = await this.supabase
                .from('dues')
                .select(`
                    id,
                    bulan,
                    tahun,
                    iuran_wajib,
                    iuran_sukarela,
                    simpanan_wajib,
                    tanggal_bayar,
                    status,
                    created_at
                `)
                .eq('member_id', memberId)
                .order('tahun', { ascending: false })
                .order('bulan', { ascending: false })
                .limit(12); // Last 12 months

            if (error) {
                console.error('Error fetching member dues:', error);
                return { dues: [], total: 0 };
            }

            const total = dues?.reduce((sum, due) => {
                const amount = (parseFloat(due.iuran_wajib) || 0) + 
                              (parseFloat(due.iuran_sukarela) || 0) + 
                              (parseFloat(due.simpanan_wajib) || 0);
                return sum + (due.status === 'lunas' ? amount : 0);
            }, 0) || 0;

            return {
                dues: dues || [],
                total,
                unpaid: dues?.filter(due => due.status === 'belum_lunas') || [],
                paid: dues?.filter(due => due.status === 'lunas') || []
            };

        } catch (error) {
            console.error('Error in getMemberDues:', error);
            return { dues: [], total: 0 };
        }
    }

    /**
     * Get member's loans information
     * @param {string} memberId - Member ID
     * @returns {Object} - Loans information
     */
    async getMemberLoans(memberId) {
        try {
            const { data: loans, error } = await this.supabase
                .from('loans')
                .select(`
                    id,
                    jumlah_pinjaman,
                    bunga_persen,
                    tenor_bulan,
                    angsuran_bulanan,
                    sisa_pinjaman,
                    status,
                    tanggal_pinjaman,
                    sudah_bayar_angsuran,
                    created_at
                `)
                .eq('member_id', memberId)
                .order('tanggal_pinjaman', { ascending: false });

            if (error) {
                console.error('Error fetching member loans:', error);
                return { loans: [], total: 0, active: 0 };
            }

            const total = loans?.reduce((sum, loan) => sum + (parseFloat(loan.jumlah_pinjaman) || 0), 0) || 0;
            const active = loans?.filter(loan => loan.status === 'aktif').length || 0;
            const totalRemaining = loans?.reduce((sum, loan) => {
                return sum + (loan.status === 'aktif' ? (parseFloat(loan.sisa_pinjaman) || 0) : 0);
            }, 0) || 0;

            return {
                loans: loans || [],
                total,
                active,
                totalRemaining,
                activeLoans: loans?.filter(loan => loan.status === 'aktif') || [],
                completedLoans: loans?.filter(loan => loan.status === 'lunas') || []
            };

        } catch (error) {
            console.error('Error in getMemberLoans:', error);
            return { loans: [], total: 0, active: 0 };
        }
    }

    /**
     * Check if phone number belongs to a registered member
     * @param {string} phoneNumber - Phone number to check
     * @returns {boolean} - True if member exists and is active
     */
    async isMemberRegistered(phoneNumber) {
        const validation = await this.validateMemberByPhone(phoneNumber);
        return validation.isValid;
    }
}

module.exports = MemberValidationService;