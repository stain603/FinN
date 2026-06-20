import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency } from "@/services/financialMetrics";
import { Payment, Client } from "@/types";

interface PaymentHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  payments: Payment[];
  clientName: string;
  client?: Client;
  isLoading?: boolean;
}

export default function PaymentHistoryModal({
  visible,
  onClose,
  payments,
  clientName,
  client,
  isLoading = false,
}: PaymentHistoryModalProps) {
  const { t } = useLanguage();

  // Calculate statistics
  const totalPaid = payments.reduce((sum, p) => sum + p.valor, 0);
  const totalParcels = client?.parcelasTotais || 0;
  const paidParcels = client?.parcelasPagas || 0;
  const remainingParcels = client?.parcelasRestantes || 0;
  const currentBalance = client?.saldoDevedor || 0;
  const percentagePaid = totalParcels > 0 ? Math.round((paidParcels / totalParcels) * 100) : 0;

  // Sort payments by date (newest first)
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.dataPagamento).getTime() - new Date(a.dataPagamento).getTime()
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="list-outline" size={24} color="#8B5CF6" />
              </View>
              <View>
                <Text style={styles.modalTitle}>{t('paymentHistory')}</Text>
                <Text style={styles.clientName}>{clientName}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Statistics */}
          {client && (
            <View style={styles.statsSection}>
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{t('progress')}</Text>
                  <Text style={styles.statValue}>{paidParcels} / {totalParcels}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{t('outstandingBalance')}</Text>
                  <Text style={[styles.statValue, currentBalance > 0 && styles.statValueDebt]}>
                    {formatCurrency(currentBalance)}
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${percentagePaid}%` }]} />
                </View>
                <Text style={styles.progressPercent}>{percentagePaid}%</Text>
              </View>
            </View>
          )}

          {/* Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>{t('loading')}</Text>
            </View>
          ) : sortedPayments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#6B7280" />
              <Text style={styles.emptyTitle}>{t('noPayments')}</Text>
              <Text style={styles.emptySubtitle}>{t('noPaymentsRecorded')}</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {sortedPayments.map((payment) => (
                <View key={payment.id} style={styles.paymentCard}>
                  <View style={styles.paymentLeft}>
                    <View style={styles.paymentIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                    <View>
                      <Text style={styles.paymentDate}>
                        {new Date(payment.dataPagamento).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                        })}
                      </Text>
                      <Text style={styles.paymentTime}>
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
            </ScrollView>
          )}

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeButtonFooter} onPress={onClose}>
              <Text style={styles.closeButtonText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#0B1329",
    borderRadius: 24,
    width: "90%",
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderRadius: 12,
    padding: 8,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  clientName: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  statsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statValueDebt: {
    color: '#EF4444',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressPercent: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
    minWidth: 40,
  },
  scrollContent: {
    padding: 20,
    maxHeight: "60%",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySubtitle: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 4,
  },
  paymentCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  paymentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentIcon: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderRadius: 10,
    padding: 6,
  },
  paymentDate: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  paymentTime: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
  },
  paymentValue: {
    color: "#10B981",
    fontSize: 15,
    fontWeight: "700",
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  closeButtonFooter: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  closeButtonText: {
    color: "#8B5CF6",
    fontSize: 15,
    fontWeight: "600",
  },
});
