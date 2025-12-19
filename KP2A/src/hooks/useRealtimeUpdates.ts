import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNotifications } from './useNotifications';

export interface RealtimeUpdateConfig {
  table: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  filter?: string;
}

export const useRealtimeUpdates = (configs: RealtimeUpdateConfig[]) => {
  const { addNotification } = useNotifications();

  const handleRealtimeEvent = useCallback((
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    table: string,
    payload: any,
    config: RealtimeUpdateConfig
  ) => {
    console.log(`Real-time ${eventType} event on ${table}:`, payload);

    // Execute the appropriate callback
    switch (eventType) {
      case 'INSERT':
        config.onInsert?.(payload);
        break;
      case 'UPDATE':
        config.onUpdate?.(payload);
        break;
      case 'DELETE':
        config.onDelete?.(payload);
        break;
    }

    // Show notification based on table and event type
    const getNotificationMessage = () => {
      switch (table) {
        case 'savings':
          switch (eventType) {
            case 'INSERT':
              return {
                title: 'Simpanan Baru',
                message: 'Data simpanan anggota telah ditambahkan',
                type: 'success' as const
              };
            case 'UPDATE':
              return {
                title: 'Simpanan Diperbarui',
                message: 'Data simpanan anggota telah diperbarui',
                type: 'info' as const
              };
            case 'DELETE':
              return {
                title: 'Simpanan Dihapus',
                message: 'Data simpanan anggota telah dihapus',
                type: 'warning' as const
              };
          }
          break;
        case 'loans':
          switch (eventType) {
            case 'INSERT':
              return {
                title: 'Pinjaman Baru',
                message: 'Data pinjaman baru telah ditambahkan',
                type: 'success' as const
              };
            case 'UPDATE':
              return {
                title: 'Pinjaman Diperbarui',
                message: 'Data pinjaman telah diperbarui',
                type: 'info' as const
              };
            case 'DELETE':
              return {
                title: 'Pinjaman Dihapus',
                message: 'Data pinjaman telah dihapus',
                type: 'warning' as const
              };
          }
          break;
        case 'loan_payments':
          switch (eventType) {
            case 'INSERT':
              return {
                title: 'Pembayaran Baru',
                message: 'Pembayaran pinjaman telah dicatat',
                type: 'success' as const
              };
            case 'UPDATE':
              return {
                title: 'Pembayaran Diperbarui',
                message: 'Data pembayaran telah diperbarui',
                type: 'info' as const
              };
          }
          break;
        case 'members':
          switch (eventType) {
            case 'INSERT':
              return {
                title: 'Anggota Baru',
                message: 'Anggota baru telah ditambahkan',
                type: 'success' as const
              };
            case 'UPDATE':
              return {
                title: 'Data Anggota Diperbarui',
                message: 'Informasi anggota telah diperbarui',
                type: 'info' as const
              };
          }
          break;
      }
      
      return {
        title: 'Data Diperbarui',
        message: `Tabel ${table} telah diperbarui`,
        type: 'info' as const
      };
    };

    const notification = getNotificationMessage();
    addNotification(notification);
  }, [addNotification]);

  useEffect(() => {
    const subscriptions: any[] = [];

    configs.forEach(config => {
      let subscription = supabase
        .channel(`realtime-${config.table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: config.table,
            filter: config.filter
          },
          (payload) => {
            handleRealtimeEvent(
              payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              config.table,
              payload,
              config
            );
          }
        )
        .subscribe();

      subscriptions.push(subscription);
    });

    return () => {
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
    };
  }, [configs, handleRealtimeEvent]);

  return {
    // Utility function to manually trigger notifications
    triggerNotification: addNotification
  };
};

// Specialized hooks for specific tables
export const useSavingsRealtimeUpdates = (
  onSavingsChange?: () => void
) => {
  return useRealtimeUpdates([
    {
      table: 'savings',
      onInsert: () => onSavingsChange?.(),
      onUpdate: () => onSavingsChange?.(),
      onDelete: () => onSavingsChange?.(),
    }
  ]);
};

export const useLoansRealtimeUpdates = (
  onLoansChange?: () => void
) => {
  return useRealtimeUpdates([
    {
      table: 'loans',
      onInsert: () => onLoansChange?.(),
      onUpdate: () => onLoansChange?.(),
      onDelete: () => onLoansChange?.(),
    },
    {
      table: 'loan_payments',
      onInsert: () => onLoansChange?.(),
      onUpdate: () => onLoansChange?.(),
    }
  ]);
};

export const useMembersRealtimeUpdates = (
  onMembersChange?: () => void
) => {
  return useRealtimeUpdates([
    {
      table: 'members',
      onInsert: () => onMembersChange?.(),
      onUpdate: () => onMembersChange?.(),
      onDelete: () => onMembersChange?.(),
    }
  ]);
};