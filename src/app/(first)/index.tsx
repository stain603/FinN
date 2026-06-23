import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BentoGrid from "../../components/organisms/bento-grid";
import LoanedCard from "../../components/organisms/bento-grid/LoanedeCard";
import ReceivableCard from "../../components/organisms/bento-grid/ReceivableCard";
import ClientsCard from "../../components/organisms/bento-grid/ClientCard";
import StaggeredText from "../../components/organisms/animated-text";
import ConfirmDialog from "../../components/base/confirm-dialog";
import PaymentScreenModal from "../../components/payment-screen-modal";
import LoadingView from "../../components/base/loading-view";
import FeedbackBanner from "../../components/base/feedback-banner";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  formatCurrency,
  getDaysUntilDue,
  getChargeStatusColor,
  getChargeSummary,
  filterPendingChargesByPeriod,
  formatDaysUntilDueLabel,
  ChargeDisplayFilter,
  isOverdue,
} from "@/services/financialMetrics";
import { normalizePhoneForWhatsApp } from "@/utils/phoneUtils";
import { triggerSuccessFeedback } from "@/utils/feedbackUtils";

export default function Home() {
  const { dashboardData, markChargeAsPaid, isLoading, loadError, refreshData, charges, clients, metrics } = useApp();
  const { userName } = useAuth();
  const { t } = useLanguage();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    destructive?: boolean;
  } | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [chargeFilter, setChargeFilter] = useState<ChargeDisplayFilter>('today');
  const [paymentFeedback, setPaymentFeedback] = useState<string | null>(null);

  const chargeSummary = useMemo(
    () => getChargeSummary(charges, clients),
    [charges, clients]
  );

  const filteredCharges = useMemo(
    () => filterPendingChargesByPeriod(charges, clients, chargeFilter),
    [charges, clients, chargeFilter]
  );

  const weekChargeCount = useMemo(
    () => filterPendingChargesByPeriod(charges, clients, 'week').length,
    [charges, clients]
  );

  const chargeFilters: { key: ChargeDisplayFilter; label: string; count: number }[] = useMemo(
    () => [
      { key: 'today', label: t('chargeFilterToday'), count: chargeSummary.hoje },
      { key: 'tomorrow', label: t('chargeFilterTomorrow'), count: chargeSummary.amanha },
      { key: 'overdue', label: t('chargeFilterOverdue'), count: chargeSummary.vencidas },
      { key: 'week', label: t('chargeFilterWeek'), count: weekChargeCount },
    ],
    [t, chargeSummary, weekChargeCount]
  );

  // Formatação da data atual por extenso
  const dataExtenso = useMemo(() => {
    const opcoes: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    return new Date().toLocaleDateString('pt-BR', opcoes);
  }, []);

  const abrirWhatsApp = useCallback((telefone: string, nome: string, valor: number) => {
    const phone = normalizePhoneForWhatsApp(telefone);
    if (!phone) {
      setDialogConfig({
        title: t('error'),
        message: t('invalidPhone'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
      return;
    }

    const mensagem = `Olá ${nome}! Passando para lembrar sobre o seu pagamento de ${formatCurrency(valor)} que está em atraso.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`;
    Linking.openURL(url).catch(() => {
      setDialogConfig({
        title: t('error'),
        message: "Não foi possível abrir o WhatsApp.",
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
    });
  }, [t]);

  const marcarComoPago = useCallback(async (chargeId: string, clienteNome: string) => {
    setDialogConfig({
      title: t('confirmPayment'),
      message: t('markAsPaidMessage', { name: clienteNome }),
      onConfirm: async () => {
        try {
          await markChargeAsPaid(chargeId);
          await triggerSuccessFeedback();
          setPaymentFeedback(t('paymentRegistered'));
        } catch (error: any) {
          setDialogConfig({
            title: t('error'),
            message: error?.message || t('paymentError'),
            onConfirm: () => setDialogVisible(false),
          });
          setDialogVisible(true);
        }
      },
    });
    setDialogVisible(true);
  }, [t, markChargeAsPaid]);

  if (isLoading) {
    return <LoadingView message={t('loading')} />;
  }

  if (loadError) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>{t('error')}</Text>
        <Text style={styles.errorMessage}>{loadError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshData}>
          <Text style={styles.retryButtonText}>{t('loadErrorRetry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      {/* ─── CONTEÚDO ROLÁVEL DA PÁGINA ─── */}
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* ─── 1. HEADER CLEAN ─── */}
        <View style={styles.headerRow}>
          <View style={styles.welcomeContainer}>
            <StaggeredText text={t('hello', { name: userName || t('user') })} style={styles.welcomeText} />
            <Text style={styles.dateText}>{dataExtenso}</Text>
          </View>
          <TouchableOpacity 
            style={styles.paymentsButton}
            onPress={() => setPaymentModalVisible(true)}
          >
            <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* ─── 2. BENTO GRID ─── */}
        <View style={styles.bentoSection}>
          <BentoGrid />
          <View style={styles.rowCards}>
            <LoanedCard />
            <ReceivableCard />
          </View>
          <ClientsCard />

          {/* Resumo rápido */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryChipValue}>{metrics.clientesAtivos}</Text>
              <Text style={styles.summaryChipLabel}>{t('activeClients')}</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryChipValue}>{metrics.clientesQuitados}</Text>
              <Text style={styles.summaryChipLabel}>{t('completedContracts')}</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={[styles.summaryChipValue, chargeSummary.pendentes > 0 && styles.summaryChipWarning]}>
                {chargeSummary.pendentes}
              </Text>
              <Text style={styles.summaryChipLabel}>{t('pendingCharges')}</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={[styles.summaryChipValue, chargeSummary.vencidas > 0 && styles.summaryChipDanger]}>
                {chargeSummary.vencidas}
              </Text>
              <Text style={styles.summaryChipLabel}>{t('overdueCharges')}</Text>
            </View>
          </View>
        </View>

        <FeedbackBanner
          visible={!!paymentFeedback}
          message={paymentFeedback || ''}
          onHide={() => setPaymentFeedback(null)}
        />

        {/* ─── 3. LISTAS DE FLUXO ─── */}
        <View style={styles.listsContainer}>

          {/* Filtro de cobranças */}
          <View style={styles.chargeFilterSection}>
            <View style={styles.chargeFilterHeader}>
              <Text style={styles.chargeFilterTitle}>{t('charges')}</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>
                  {chargeSummary.pendentes} {t('pending')}
                </Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chargeFilterScroll}>
              {chargeFilters.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.chargeFilterChip, chargeFilter === f.key && styles.chargeFilterChipActive]}
                  onPress={() => setChargeFilter(f.key)}
                >
                  <Text style={[styles.chargeFilterText, chargeFilter === f.key && styles.chargeFilterTextActive]}>
                    {f.label}
                  </Text>
                  {f.count > 0 && (
                    <View style={[styles.chargeCountBadge, f.key === 'overdue' && styles.chargeCountBadgeDanger]}>
                      <Text style={styles.chargeCountText}>{f.count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredCharges.length > 0 ? (
              filteredCharges.map(c => {
                const overdue = isOverdue(c.dataVencimento);
                const statusColor = getChargeStatusColor(c);
                return (
                  <View key={c.id} style={[styles.customerCard, overdue && styles.overdueCard]}>
                    <View style={styles.customerCardLeft}>
                      <View style={styles.statusIndicatorContainer}>
                        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.customerName} numberOfLines={1}>{c.clienteNome}</Text>
                        <Text style={[styles.customerMeta, overdue && styles.overdueMeta]}>
                          {formatDaysUntilDueLabel(c.dataVencimento)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.customerCardRight}>
                      <Text style={[styles.customerValue, overdue && styles.overdueValue]}>{formatCurrency(c.valor)}</Text>
                      <TouchableOpacity
                        style={styles.paidButton}
                        onPress={() => marcarComoPago(c.id, c.clienteNome)}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.filterEmptyState}>
                <Ionicons name="calendar-outline" size={32} color="#6B7280" />
                <Text style={styles.filterEmptyText}>{t('noChargesForFilter')}</Text>
              </View>
            )}
          </View>
          
          {/* LISTA A: CLIENTES ATRASADOS */}
          {dashboardData.clientesAtrasados.length > 0 && (
            <View style={styles.listSection}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>{t('overdueClients')}</Text>
                <Text style={styles.listSubtitle}>
                  {dashboardData.clientesAtrasados.length} {t('clients')} • {formatCurrency(dashboardData.clientesAtrasados.reduce((sum, c) => sum + c.valor, 0))} {t('pending')}
                </Text>
                <View style={styles.alertBadge}>
                  <Ionicons name="warning" size={14} color="#EF4444" />
                </View>
              </View>
              {dashboardData.clientesAtrasados.map(c => {
                const diasAtraso = c.diasAtraso ?? Math.abs(getDaysUntilDue(c.dataVencimento));
                const statusColor = getChargeStatusColor(c);
                return (
                  <View key={c.id} style={styles.overdueCard}>
                    <View style={styles.overdueLeft}>
                      <View style={styles.statusIndicatorContainer}>
                        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                      </View>
                      <View>
                        <Text style={styles.customerName}>{c.clienteNome}</Text>
                        <Text style={styles.customerMeta}>{t('overdueBy', { days: diasAtraso })}</Text>
                        {c.saldoDevedor !== undefined && (
                          <Text style={styles.customerMeta}>{t('balance')}: {formatCurrency(c.saldoDevedor)}</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.overdueRight}>
                      <Text style={styles.customerValue}>{formatCurrency(c.valor)}</Text>
                      <View style={styles.overdueActions}>
                        <TouchableOpacity
                          style={styles.paidButton}
                          onPress={() => marcarComoPago(c.id, c.clienteNome)}
                        >
                          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                        </TouchableOpacity>
                        {c.telefone && (
                          <TouchableOpacity
                            style={styles.whatsappSmallButton}
                            onPress={() => abrirWhatsApp(c.telefone!, c.clienteNome, c.valor)}
                          >
                            <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* LISTA B: CLIENTES QUE PAGAM HOJE */}
          {dashboardData.clientesHoje.length > 0 && (
            <View style={styles.listSection}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>{t('todayPayments')}</Text>
                <Text style={styles.listSubtitle}>
                  {dashboardData.clientesHoje.length} {t('charges')} • {formatCurrency(dashboardData.clientesHoje.reduce((sum, c) => sum + c.valor, 0))}
                </Text>
                <View style={styles.infoBadge}>
                  <Ionicons name="time" size={14} color="#3B82F6" />
                </View>
              </View>
              {dashboardData.clientesHoje.map(c => {
                const statusColor = getChargeStatusColor(c);
                return (
                  <View key={c.id} style={styles.customerCard}>
                    <View style={styles.customerCardLeft}>
                      <View style={styles.statusIndicatorContainer}>
                        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                      </View>
                      <View>
                        <Text style={styles.customerName}>{c.clienteNome}</Text>
                        <Text style={styles.customerMeta}>{t('dueToday')}</Text>
                      </View>
                    </View>
                    <View style={styles.customerCardRight}>
                      <Text style={styles.customerValue}>{formatCurrency(c.valor)}</Text>
                      <TouchableOpacity
                        style={styles.paidButton}
                        onPress={() => marcarComoPago(c.id, c.clienteNome)}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* LISTA C: LISTA DA SEMANA */}
          {dashboardData.listaSemana.length > 0 && (
            <View style={styles.listSection}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>{t('weekList')}</Text>
                <Text style={styles.listSubtitle}>
                  {dashboardData.listaSemana.length} {t('charges')} • {formatCurrency(dashboardData.listaSemana.reduce((sum, c) => sum + c.valor, 0))}
                </Text>
                <View style={styles.infoBadge}>
                  <Ionicons name="calendar" size={14} color="#8B5CF6" />
                </View>
              </View>
              {dashboardData.listaSemana.map(c => {
                const diasAteVencimento = getDaysUntilDue(c.dataVencimento);
                const statusColor = getChargeStatusColor(c);
                return (
                  <View key={c.id} style={styles.customerCard}>
                    <View style={styles.customerCardLeft}>
                      <View style={styles.statusIndicatorContainer}>
                        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                      </View>
                      <View>
                        <Text style={styles.customerName}>{c.clienteNome}</Text>
                        <Text style={styles.customerMeta}>
                          {diasAteVencimento === 1 ? 'Amanhã' : `Em ${diasAteVencimento} dias`}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.customerCardRight}>
                      <Text style={styles.customerValue}>{formatCurrency(c.valor)}</Text>
                      <Text style={styles.customerMeta}>
                        {new Date(c.dataVencimento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* LISTA C: PAGOS HOJE */}
          {dashboardData.pagosHoje.length > 0 && (
            <View style={styles.listSection}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>{t('paidToday')}</Text>
                <Text style={styles.listSubtitle}>
                  {dashboardData.pagosHoje.length} {t('charges')} • {formatCurrency(dashboardData.pagosHoje.reduce((sum, p) => sum + p.valor, 0))} {t('received')}
                </Text>
                <View style={styles.successBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                </View>
              </View>
              {dashboardData.pagosHoje.map(p => (
                <View key={p.id} style={styles.paidCard}>
                  <View style={styles.paidLeft}>
                    <View style={styles.paidIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                    <View>
                      <Text style={styles.customerName}>{p.clienteNome}</Text>
                      <Text style={styles.customerMeta}>
                        {t('paidAt', { time: new Date(p.dataPagamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.paidValue}>{formatCurrency(p.valor)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* LISTA D: CONTRATOS CONCLUÍDOS */}
          {dashboardData.contratosConcluidos.length > 0 && (
            <View style={styles.listSection}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>{t('completedContracts')}</Text>
                <View style={styles.successBadge}>
                  <Ionicons name="ribbon" size={14} color="#10B981" />
                </View>
              </View>
              {dashboardData.contratosConcluidos.map(c => (
                <View key={c.id} style={styles.completedCard}>
                  <View style={styles.completedLeft}>
                    <View style={styles.completedIcon}>
                      <Ionicons name="ribbon" size={20} color="#10B981" />
                    </View>
                    <View>
                      <Text style={styles.customerName}>{c.nome}</Text>
                      <Text style={styles.customerMeta}>
                        {t('contractValue')}: {formatCurrency(c.valorTotalReceber)}
                      </Text>
                      <Text style={styles.customerMeta}>
                        {t('startDate')}: {new Date(c.dataInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </Text>
                      {c.dataTermino && (
                        <Text style={styles.customerMeta}>
                          {t('completionDate')}: {new Date(c.dataTermino).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.completedRight}>
                    <Text style={styles.completedValue}>{formatCurrency(c.valorTotalReceber)}</Text>
                    <Text style={styles.completedLabel}>{t('total')}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Empty state when no data */}
          {dashboardData.clientesAtrasados.length === 0 && 
           dashboardData.clientesHoje.length === 0 && 
           dashboardData.pagosHoje.length === 0 &&
           dashboardData.listaSemana.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
              <Text style={styles.emptyStateTitle}>{t('allUpToDate')}</Text>
              <Text style={styles.emptyStateSubtitle}>{t('noPendingPayments')}</Text>
            </View>
          )}

        </View>
      </ScrollView>

      <ConfirmDialog
        visible={dialogVisible}
        title={dialogConfig?.title || ''}
        message={dialogConfig?.message || ''}
        onConfirm={async () => {
          await dialogConfig?.onConfirm();
          setDialogVisible(false);
        }}
        onCancel={() => setDialogVisible(false)}
        destructive={dialogConfig?.destructive}
      />

      <PaymentScreenModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#060b13",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFF",
    fontSize: 16,
  },
  errorTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  errorMessage: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: "#060b13", 
  },
  scrollContent: {
    backgroundColor: "#060b13", 
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 65,
    marginBottom: 30,
  },
  paymentsButton: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  welcomeContainer: {
    marginBottom: 10,
  },
  welcomeText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  dateText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  bentoSection: {
    gap: 16,
    marginBottom: 35,
  },
  rowCards: {
    flexDirection: "row",
    gap: 16,
  },
  listsContainer: {
    gap: 28,
  },
  listSection: {
    gap: 12,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF', 
    paddingLeft: 2,
    letterSpacing: -0.2,
  },
  listSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  customerCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)', 
  },
  customerCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerCardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  customerName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  customerMeta: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 3,
  },
  customerValue: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: 4,
  },
  infoBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 12,
    padding: 4,
  },
  successBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    padding: 4,
  },
  overdueCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: 8,
  },
  overdueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  statusIndicatorContainer: {
    marginRight: 4,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  alertIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    padding: 6,
  },
  overdueRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  overdueActions: {
    flexDirection: 'row',
    gap: 6,
  },
  paidButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  whatsappSmallButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 6,
  },
  paidCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 8,
  },
  paidLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  paidIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 10,
    padding: 6,
  },
  paidValue: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '700',
  },
  completedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 8,
  },
  completedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  completedIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 10,
    padding: 6,
  },
  completedRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  completedValue: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '700',
  },
  completedLabel: {
    color: '#6B7280',
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyStateSubtitle: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryChip: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryChipValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  summaryChipWarning: {
    color: '#F59E0B',
  },
  summaryChipDanger: {
    color: '#EF4444',
  },
  summaryChipLabel: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  chargeFilterSection: {
    gap: 12,
    marginBottom: 8,
  },
  chargeFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chargeFilterTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  pendingBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700',
  },
  chargeFilterScroll: {
    marginBottom: 4,
  },
  chargeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 8,
  },
  chargeFilterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chargeFilterText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  chargeFilterTextActive: {
    color: '#FFFFFF',
  },
  chargeCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chargeCountBadgeDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  chargeCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  filterEmptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterEmptyText: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 8,
  },
  overdueMeta: {
    color: '#EF4444',
  },
  overdueValue: {
    color: '#EF4444',
  },
});
