import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApp } from '@/contexts/AppContext';
import {
  formatCurrency,
  isToday,
  isCurrentMonth,
  recebidoUltimos30Dias,
  groupPaymentsByMonth,
} from '@/services/financialMetrics';

type FilterType = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

interface PaymentScreenModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PaymentScreenModal({ visible, onClose }: PaymentScreenModalProps) {
  const { t } = useLanguage();
  const { payments } = useApp();
  const [filter, setFilter] = useState<FilterType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const filteredPayments = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const yearStart = new Date(today.getFullYear(), 0, 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    switch (filter) {
      case 'today':
        return payments.filter(p => isToday(p.dataPagamento));
      case 'week':
        return payments.filter(p => {
          const paymentDate = new Date(p.dataPagamento);
          return paymentDate >= sevenDaysAgo && paymentDate <= today;
        });
      case 'month':
        return payments.filter(p => isCurrentMonth(p.dataPagamento));
      case 'year':
        return payments.filter(p => {
          const paymentDate = new Date(p.dataPagamento);
          return paymentDate >= yearStart && paymentDate <= today;
        });
      case 'custom':
        if (!customStartDate || !customEndDate) return payments;
        return payments.filter(p => {
          const paymentDate = new Date(p.dataPagamento);
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          return paymentDate >= start && paymentDate <= end;
        });
      default:
        return [...payments].sort(
          (a, b) => new Date(b.dataPagamento).getTime() - new Date(a.dataPagamento).getTime()
        );
    }
  }, [payments, filter, customStartDate, customEndDate]);

  const groupedPayments = useMemo(
    () => groupPaymentsByMonth(filteredPayments),
    [filteredPayments]
  );

  const statistics = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const totalToday = payments
      .filter(p => isToday(p.dataPagamento))
      .reduce((sum, p) => sum + p.valor, 0);

    const totalWeek = payments
      .filter(p => {
        const paymentDate = new Date(p.dataPagamento);
        return paymentDate >= sevenDaysAgo && paymentDate <= today;
      })
      .reduce((sum, p) => sum + p.valor, 0);

    const totalMonth = payments
      .filter(p => isCurrentMonth(p.dataPagamento))
      .reduce((sum, p) => sum + p.valor, 0);

    const totalLast30Days = recebidoUltimos30Dias(payments);

    return { totalToday, totalWeek, totalMonth, totalLast30Days };
  }, [payments]);

  const FilterButton = ({ type, label }: { type: FilterType; label: string }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === type && styles.filterButtonActive]}
      onPress={() => setFilter(type)}
    >
      <Text style={[styles.filterButtonText, filter === type && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('paymentHistory')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('todayPayments')}</Text>
            <Text style={styles.statValue}>{formatCurrency(statistics.totalToday)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('currentMonth')}</Text>
            <Text style={styles.statValue}>{formatCurrency(statistics.totalMonth)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('last30Days')}</Text>
            <Text style={styles.statValue}>{formatCurrency(statistics.totalLast30Days)}</Text>
          </View>
        </View>

        <View style={styles.weekStatRow}>
          <Ionicons name="trending-up" size={14} color="#10B981" />
          <Text style={styles.weekStatText}>
            {t('weekList')}: {formatCurrency(statistics.totalWeek)}
          </Text>
        </View>

        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            <FilterButton type="all" label={t('all')} />
            <FilterButton type="today" label={t('todayPayments')} />
            <FilterButton type="week" label={t('weekList')} />
            <FilterButton type="month" label={t('month')} />
            <FilterButton type="year" label={t('year')} />
            <FilterButton type="custom" label={t('custom')} />
          </ScrollView>
        </View>

        {filter === 'custom' && (
          <View style={styles.customDateContainer}>
            <TextInput
              style={styles.dateInput}
              placeholder="Data Início (YYYY-MM-DD)"
              placeholderTextColor="#6B7280"
              value={customStartDate}
              onChangeText={setCustomStartDate}
            />
            <TextInput
              style={styles.dateInput}
              placeholder="Data Fim (YYYY-MM-DD)"
              placeholderTextColor="#6B7280"
              value={customEndDate}
              onChangeText={setCustomEndDate}
            />
          </View>
        )}

        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredPayments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#6B7280" />
              <Text style={styles.emptyStateTitle}>{t('noPayments')}</Text>
              <Text style={styles.emptyStateSubtitle}>{t('noPaymentsRecorded')}</Text>
            </View>
          ) : (
            groupedPayments.map(group => (
              <View key={group.key} style={styles.monthGroup}>
                <View style={styles.monthHeader}>
                  <Text style={styles.monthTitle}>{group.label}</Text>
                  <Text style={styles.monthTotal}>{formatCurrency(group.total)}</Text>
                </View>
                {group.payments.map(payment => (
                  <View key={payment.id} style={styles.paymentCard}>
                    <View style={styles.paymentLeft}>
                      <View style={styles.paymentIcon}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.clientName} numberOfLines={1}>{payment.clienteNome}</Text>
                        <Text style={styles.paymentMeta}>
                          {new Date(payment.dataPagamento).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                          })}
                          {' • '}
                          {new Date(payment.dataPagamento).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.paymentValue}>{formatCurrency(payment.valor)}</Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060b13',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 8,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  weekStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  weekStatText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filtersScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  customDateContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  dateInput: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  monthGroup: {
    marginBottom: 20,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  monthTitle: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  monthTotal: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyStateSubtitle: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  paymentCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 8,
  },
  paymentIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 10,
    padding: 8,
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  paymentMeta: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  paymentValue: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
  },
});
