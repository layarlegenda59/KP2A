// WhatsApp Notification Service
// Handles sending notifications and alerts to WhatsApp mobile
// Updated to fix ERR_ABORTED issues

export interface NotificationTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  category: 'transaction' | 'reminder' | 'alert' | 'info';
}

export interface NotificationRecipient {
  phoneNumber: string;
  name: string;
  memberId?: string;
  isAdmin: boolean;
}

export interface NotificationLog {
  id: string;
  recipient: string;
  message: string;
  template: string;
  status: 'sent' | 'failed' | 'pending';
  timestamp: Date;
  error?: string;
}

export class WhatsAppNotificationService {
  private templates: NotificationTemplate[] = [
    {
      id: 'new_transaction',
      name: 'Transaksi Baru',
      template: '💰 *TRANSAKSI BARU*\n\nHalo {name}!\nTransaksi {type} sebesar Rp {amount} telah berhasil diproses.\n\n📅 Tanggal: {date}\n🏦 Saldo: Rp {balance}\n\nTerima kasih telah menggunakan layanan KP2A Cimahi.',
      variables: ['name', 'type', 'amount', 'date', 'balance'],
      category: 'transaction'
    },
    {
      id: 'payment_reminder',
      name: 'Pengingat Pembayaran',
      template: '⏰ *PENGINGAT PEMBAYARAN*\n\nHalo {name}!\nAngsuran pinjaman Anda jatuh tempo pada {dueDate}.\n\n💵 Jumlah: Rp {amount}\n📍 Bayar di: Kantor KP2A Cimahi\n\nJangan lupa untuk melakukan pembayaran tepat waktu.',
      variables: ['name', 'dueDate', 'amount'],
      category: 'reminder'
    },
    {
      id: 'overdue_alert',
      name: 'Alert Tunggakan',
      template: '🚨 *PERINGATAN TUNGGAKAN*\n\nHalo {name}!\nAnda memiliki tunggakan pembayaran:\n\n💸 Jumlah: Rp {amount}\n📅 Jatuh Tempo: {dueDate}\n⏳ Terlambat: {daysPast} hari\n\nSegera lakukan pembayaran untuk menghindari denda.',
      variables: ['name', 'amount', 'dueDate', 'daysPast'],
      category: 'alert'
    },
    {
      id: 'meeting_reminder',
      name: 'Pengingat Rapat',
      template: '📅 *PENGINGAT RAPAT ANGGOTA*\n\nHalo {name}!\nRapat anggota KP2A Cimahi akan dilaksanakan:\n\n📅 Tanggal: {date}\n⏰ Waktu: {time}\n📍 Tempat: {location}\n\nKehadiran Anda sangat diharapkan.',
      variables: ['name', 'date', 'time', 'location'],
      category: 'info'
    },
    {
      id: 'system_maintenance',
      name: 'Maintenance Sistem',
      template: '🔧 *MAINTENANCE SISTEM*\n\nSistem KP2A Cimahi akan menjalani maintenance:\n\n📅 Tanggal: {date}\n⏰ Waktu: {startTime} - {endTime}\n\nSelama maintenance, layanan online tidak dapat diakses.\nTerima kasih atas pengertiannya.',
      variables: ['date', 'startTime', 'endTime'],
      category: 'info'
    },
    {
      id: 'backup_success',
      name: 'Backup Berhasil',
      template: '✅ *BACKUP DATABASE BERHASIL*\n\n📊 Backup database KP2A Cimahi telah selesai:\n\n📅 Waktu: {timestamp}\n💾 Ukuran: {size}\n📁 File: {filename}\n\nData telah aman tersimpan.',
      variables: ['timestamp', 'size', 'filename'],
      category: 'info'
    }
  ];

  private notificationLogs: NotificationLog[] = [];

  // Send notification to single recipient
  async sendNotification(
    templateId: string, 
    recipient: NotificationRecipient, 
    variables: Record<string, string>
  ): Promise<boolean> {
    try {
      const template = this.templates.find(t => t.id === templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Replace variables in template
      let message = template.template;
      template.variables.forEach(variable => {
        const value = variables[variable] || `{${variable}}`;
        message = message.replace(new RegExp(`{${variable}}`, 'g'), value);
      });

      // Simulate sending (in real implementation, this would call WhatsApp API)
      const success = await this.simulateSendMessage(recipient.phoneNumber, message);

      // Log the notification
      const log: NotificationLog = {
        id: Date.now().toString(),
        recipient: recipient.phoneNumber,
        message,
        template: templateId,
        status: success ? 'sent' : 'failed',
        timestamp: new Date(),
        error: success ? undefined : 'Simulated failure'
      };

      this.notificationLogs.unshift(log);
      
      return success;
    } catch (error) {
      console.error('Failed to send notification:', error);
      
      // Log failed notification
      const log: NotificationLog = {
        id: Date.now().toString(),
        recipient: recipient.phoneNumber,
        message: 'Failed to process template',
        template: templateId,
        status: 'failed',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      this.notificationLogs.unshift(log);
      
      return false;
    }
  }

  // Send notification to multiple recipients
  async sendBulkNotification(
    templateId: string,
    recipients: NotificationRecipient[],
    variables: Record<string, string>
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const recipient of recipients) {
      // Personalize variables for each recipient
      const personalizedVariables = {
        ...variables,
        name: recipient.name,
        memberId: recipient.memberId || ''
      };

      const result = await this.sendNotification(templateId, recipient, personalizedVariables);
      if (result) {
        success++;
      } else {
        failed++;
      }

      // Add small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { success, failed };
  }

  // Send admin alert
  async sendAdminAlert(message: string, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<boolean> {
    const adminRecipients: NotificationRecipient[] = [
      {
        phoneNumber: '+62 812-3456-7890',
        name: 'Admin KP2A',
        isAdmin: true
      }
    ];

    const priorityIcon = priority === 'high' ? '🚨' : priority === 'medium' ? '⚠️' : 'ℹ️';
    const alertMessage = `${priorityIcon} *ALERT SISTEM*\n\n${message}\n\n📅 Waktu: ${new Date().toLocaleString('id-ID')}`;

    for (const admin of adminRecipients) {
      await this.simulateSendMessage(admin.phoneNumber, alertMessage);
    }

    return true;
  }

  // Get notification templates
  getTemplates(): NotificationTemplate[] {
    return this.templates;
  }

  // Get notification logs
  getNotificationLogs(limit: number = 50): NotificationLog[] {
    return this.notificationLogs.slice(0, limit);
  }

  // Get notification statistics
  getNotificationStats(): {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    todayCount: number;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = this.notificationLogs.filter(log => 
      log.timestamp >= today
    );

    return {
      total: this.notificationLogs.length,
      sent: this.notificationLogs.filter(log => log.status === 'sent').length,
      failed: this.notificationLogs.filter(log => log.status === 'failed').length,
      pending: this.notificationLogs.filter(log => log.status === 'pending').length,
      todayCount: todayLogs.length
    };
  }

  // Simulate sending message (replace with actual WhatsApp API call)
  private async simulateSendMessage(phoneNumber: string, message: string): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // Simulate 95% success rate
    return Math.random() > 0.05;
  }

  // Predefined notification scenarios for testing
  async sendTestNotifications(): Promise<void> {
    const testRecipients: NotificationRecipient[] = [
      {
        phoneNumber: '+62 812-1111-1111',
        name: 'Sari Dewi',
        memberId: 'A001',
        isAdmin: false
      },
      {
        phoneNumber: '+62 812-2222-2222',
        name: 'Budi Santoso',
        memberId: 'A002',
        isAdmin: false
      }
    ];

    // Test transaction notification
    await this.sendNotification('new_transaction', testRecipients[0], {
      name: 'Sari Dewi',
      type: 'Simpanan Wajib',
      amount: '50.000',
      date: new Date().toLocaleDateString('id-ID'),
      balance: '2.250.000'
    });

    // Test payment reminder
    await this.sendNotification('payment_reminder', testRecipients[1], {
      name: 'Budi Santoso',
      dueDate: '15 Februari 2024',
      amount: '450.000'
    });

    // Test admin alert
    await this.sendAdminAlert('Database backup completed successfully', 'low');
  }

  // Schedule automatic notifications (in real app, this would be handled by cron jobs)
  scheduleNotifications(): void {
    // Daily payment reminders at 09:00
    this.scheduleDaily('09:00', () => {
      this.sendPaymentReminders();
    });

    // Weekly overdue alerts on Monday at 10:00
    this.scheduleWeekly('monday', '10:00', () => {
      this.sendOverdueAlerts();
    });

    // Monthly meeting reminders
    this.scheduleMonthly(25, '15:00', () => {
      this.sendMeetingReminders();
    });
  }

  private async sendPaymentReminders(): Promise<void> {
    // In real implementation, this would query database for upcoming due dates
    console.log('Sending daily payment reminders...');
  }

  private async sendOverdueAlerts(): Promise<void> {
    // In real implementation, this would query database for overdue payments
    console.log('Sending overdue alerts...');
  }

  private async sendMeetingReminders(): Promise<void> {
    // In real implementation, this would send meeting reminders to all members
    console.log('Sending meeting reminders...');
  }

  private scheduleDaily(time: string, callback: () => void): void {
    // Simplified scheduling - in real app use proper scheduler like node-cron
    console.log(`Scheduled daily task at ${time}`);
  }

  private scheduleWeekly(day: string, time: string, callback: () => void): void {
    console.log(`Scheduled weekly task on ${day} at ${time}`);
  }

  private scheduleMonthly(date: number, time: string, callback: () => void): void {
    console.log(`Scheduled monthly task on ${date}th at ${time}`);
  }
}

// Export singleton instance
export const whatsappNotificationService = new WhatsAppNotificationService();