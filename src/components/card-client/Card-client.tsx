import React, { useState, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import ConfirmDialog from "@/components/base/confirm-dialog";
import {
  formatCurrency,
  formatDaysUntilDueLabel,
  getDaysUntilDue,
  isNewContract,
  isOverdue,
  isToday,
} from "@/services/financialMetrics";
import { normalizePhoneForWhatsApp } from "@/utils/phoneUtils";
import { copyToClipboard } from "@/utils/clipboardUtils";
import { triggerLightFeedback } from "@/utils/feedbackUtils";

interface CardClienteProps {
  nome: string;
  telefone: string;
  endereco?: string;
  valorEmprestado: string;
  valorTotalReceber: string;
  valorParcela: string;
  frequencia: "Diário" | "Semanal" | "Mensal" | "Anual";
  observacao?: string;
  dataInicio?: string;
  onDelete?: () => void;
  onEdit?: () => void;
  onMarkPayment?: () => void;
  onViewHistory?: () => void;
  lucroEsperado?: number;
  valorRecebido?: number;
  parcelasTotais?: number;
  parcelasPagas?: number;
  parcelasRestantes?: number;
  saldoDevedor?: number;
  proximoVencimento?: string;
  status?: "ativo" | "pendente" | "atrasado" | "quitado" | "cancelado";
}

function CardCliente({
  nome,
  telefone,
  endereco,
  valorEmprestado,
  valorTotalReceber,
  valorParcela,
  frequencia,
  observacao,
  dataInicio,
  onDelete,
  lucroEsperado,
  valorRecebido,
  parcelasTotais,
  parcelasPagas,
  parcelasRestantes,
  saldoDevedor,
  proximoVencimento,
  status,
  onEdit,
  onMarkPayment,
  onViewHistory,
}: CardClienteProps) {
  const { t } = useLanguage();
  const [menuVisible, setMenuVisible] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    destructive?: boolean;
  } | null>(null);

  const isNew = dataInicio ? isNewContract(dataInicio) : false;

  const getStatusColor = () => {
    if (status === 'quitado') return '#3B82F6';
    if (status === 'atrasado') return '#EF4444';
    if (status === 'cancelado') return '#6B7280';

    if (proximoVencimento) {
      if (isToday(proximoVencimento)) return '#F59E0B';
      if (isOverdue(proximoVencimento) && saldoDevedor && saldoDevedor > 0) return '#EF4444';
    }

    return '#10B981';
  };

  const statusColor = getStatusColor();

  const percentComplete =
    parcelasTotais && parcelasTotais > 0 && parcelasPagas !== undefined
      ? Math.round((parcelasPagas / parcelasTotais) * 100)
      : 0;

  const dueLabel = proximoVencimento && status !== 'quitado'
    ? formatDaysUntilDueLabel(proximoVencimento)
    : null;

  const isDueOverdue = proximoVencimento ? isOverdue(proximoVencimento) : false;

  const showCopyFeedback = useCallback((message: string) => {
    setCopyFeedback(message);
    setTimeout(() => setCopyFeedback(null), 2000);
  }, []);

  const handleCopyPhone = useCallback(async () => {
    const ok = await copyToClipboard(telefone);
    if (ok) {
      await triggerLightFeedback();
      showCopyFeedback(t('phoneCopied'));
    }
  }, [telefone, t, showCopyFeedback]);

  const handleCopyAddress = useCallback(async () => {
    if (!endereco) return;
    const ok = await copyToClipboard(endereco);
    if (ok) {
      await triggerLightFeedback();
      showCopyFeedback(t('addressCopied'));
    }
  }, [endereco, t, showCopyFeedback]);

  const abrirWhatsApp = useCallback(() => {
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

    const mensagem = `Olá ${nome}! Passando para lembrar sobre o seu pagamento da parcela de ${valorParcela} (${frequencia}) referente ao serviço contratado.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`;

    Linking.openURL(url).catch(() => {
      setDialogConfig({
        title: t('error'),
        message: t('whatsappError'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
    });
  }, [telefone, nome, valorParcela, frequencia, t]);

  const handleDelete = () => {
    setDialogConfig({
      title: t('confirmDelete'),
      message: t('deleteClientMessage', { name: nome }),
      onConfirm: () => {
        onDelete?.();
        setDialogVisible(false);
      },
      destructive: true,
    });
    setDialogVisible(true);
  };

  const handleQuickPayment = async () => {
    setMenuVisible(false);
    await triggerLightFeedback();
    onMarkPayment?.();
  };

  return (
    <>
      <View style={[styles.card, isDueOverdue && status !== 'quitado' && styles.cardOverdue]}>
        {copyFeedback && (
          <View style={styles.copyFeedback}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.copyFeedbackText}>{copyFeedback}</Text>
          </View>
        )}

        <View style={styles.headerRow}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{nome.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            </View>
            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <Text style={styles.nomeText} numberOfLines={1}>{nome}</Text>
                {isNew && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>{t('newContractBadge')}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.tipoText}>
                {frequencia} • {t('installmentValue')}: <Text style={styles.destaqueVerde}>{valorParcela}</Text>
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.menuButton}
            activeOpacity={0.7}
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionBtn} onPress={handleCopyPhone}>
            <Ionicons name="copy-outline" size={16} color="#3B82F6" />
            <Text style={styles.quickActionText}>{t('copyPhone')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionBtn} onPress={abrirWhatsApp}>
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
            <Text style={styles.quickActionText}>WhatsApp</Text>
          </TouchableOpacity>
          {endereco ? (
            <TouchableOpacity style={styles.quickActionBtn} onPress={handleCopyAddress}>
              <Ionicons name="location-outline" size={16} color="#8B5CF6" />
              <Text style={styles.quickActionText}>{t('copyAddress')}</Text>
            </TouchableOpacity>
          ) : null}
          {onMarkPayment && status !== 'quitado' && (
            <TouchableOpacity style={[styles.quickActionBtn, styles.quickActionPay]} onPress={handleQuickPayment}>
              <Ionicons name="cash-outline" size={16} color="#10B981" />
              <Text style={[styles.quickActionText, { color: '#10B981' }]}>{t('markPayment')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.detailsContainer}>
          {endereco ? (
            <Text style={styles.enderecoText} numberOfLines={2}>{endereco}</Text>
          ) : null}

          <View style={styles.dataRow}>
            <View style={styles.dataGroup}>
              <Text style={styles.dataLabel}>{t('loanAmount')}</Text>
              <Text style={styles.dataValue}>{valorEmprestado}</Text>
            </View>
            <View style={styles.dataGroup}>
              <Text style={styles.dataLabel}>{t('totalTransaction')}</Text>
              <Text style={styles.dataValue}>{valorTotalReceber}</Text>
            </View>
          </View>

          <View style={styles.dataRow}>
            <View style={styles.dataGroup}>
              <Text style={styles.dataLabel}>{t('installmentValue')}</Text>
              <Text style={[styles.dataValue, styles.destaqueVerde]}>{valorParcela}</Text>
            </View>
            <View style={styles.dataGroup}>
              <Text style={styles.dataLabel}>{t('amountPaid')}</Text>
              <Text style={[styles.dataValue, styles.receivedValue]}>
                {valorRecebido !== undefined ? formatCurrency(valorRecebido) : '—'}
              </Text>
            </View>
          </View>

          <View style={styles.dataRow}>
            <View style={styles.dataGroup}>
              <Text style={styles.dataLabel}>{t('remainingAmount')}</Text>
              <Text style={[styles.dataValue, (saldoDevedor ?? 0) > 0 ? styles.debtValue : styles.receivedValue]}>
                {saldoDevedor !== undefined ? formatCurrency(saldoDevedor) : '—'}
              </Text>
            </View>
            <View style={styles.dataGroup}>
              <Text style={styles.dataLabel}>{t('paidInstallmentsLabel')}</Text>
              <Text style={styles.dataValue}>
                {parcelasPagas !== undefined && parcelasTotais !== undefined
                  ? `${parcelasPagas} / ${parcelasTotais} ${t('installments')}`
                  : '—'}
              </Text>
            </View>
          </View>
        </View>

        {(parcelasTotais !== undefined && parcelasPagas !== undefined) && (
          <View style={styles.progressContainer}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>{t('progress')}</Text>
              <Text style={styles.progressText}>
                {parcelasPagas}/{parcelasTotais} • {percentComplete}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(100, percentComplete)}%` }]} />
            </View>
            <View style={styles.progressMeta}>
              {parcelasRestantes !== undefined && (
                <Text style={styles.remainingInstallments}>
                  {parcelasRestantes} {t('remainingInstallments')}
                </Text>
              )}
              {dueLabel && (
                <Text style={[styles.dueLabel, isDueOverdue && styles.dueLabelOverdue]}>
                  {dueLabel}
                </Text>
              )}
            </View>
          </View>
        )}

        {(saldoDevedor !== undefined || proximoVencimento) && (
          <View style={styles.financialStatus}>
            {saldoDevedor !== undefined && (
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>{t('remainingBalance')}</Text>
                <Text style={[styles.statusValue, saldoDevedor > 0 ? styles.statusValueDebt : styles.statusValuePaid]}>
                  {formatCurrency(saldoDevedor)}
                </Text>
              </View>
            )}
            {proximoVencimento && status !== 'quitado' && (
              <View style={[styles.statusItem, { alignItems: 'flex-end' }]}>
                <Text style={styles.statusLabel}>{t('nextDueDate')}</Text>
                <Text style={[styles.statusValue, isDueOverdue && styles.statusValueDebt]}>
                  {new Date(proximoVencimento).toLocaleDateString('pt-BR')}
                </Text>
                {proximoVencimento && (
                  <Text style={[styles.daysCounter, isDueOverdue && styles.daysCounterOverdue]}>
                    {getDaysUntilDue(proximoVencimento) >= 0
                      ? `${getDaysUntilDue(proximoVencimento)}d`
                      : `${Math.abs(getDaysUntilDue(proximoVencimento))}d atraso`}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {observacao ? (
          <View style={styles.obsContainer}>
            <Text style={styles.obsText} numberOfLines={2}>
              <Text style={{ fontWeight: "700", color: "#6B7280" }}>{t('observations')}: </Text>
              {observacao}
            </Text>
          </View>
        ) : null}
      </View>

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); onEdit?.(); }}>
              <Ionicons name="create-outline" size={20} color="#3B82F6" />
              <Text style={styles.menuItemText}>{t('edit')}</Text>
            </TouchableOpacity>
            {onMarkPayment && status !== 'quitado' && (
              <TouchableOpacity style={styles.menuItem} onPress={handleQuickPayment}>
                <Ionicons name="cash-outline" size={20} color="#10B981" />
                <Text style={styles.menuItemText}>{t('markPayment')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); abrirWhatsApp(); }}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <Text style={styles.menuItemText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); handleCopyPhone(); }}>
              <Ionicons name="copy-outline" size={20} color="#3B82F6" />
              <Text style={styles.menuItemText}>{t('copyPhone')}</Text>
            </TouchableOpacity>
            {onViewHistory && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); onViewHistory(); }}>
                <Ionicons name="list-outline" size={20} color="#8B5CF6" />
                <Text style={styles.menuItemText}>{t('paymentHistory')}</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); handleDelete(); }}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text style={styles.menuItemText}>{t('delete')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <ConfirmDialog
        visible={dialogVisible}
        title={dialogConfig?.title || ''}
        message={dialogConfig?.message || ''}
        onConfirm={() => {
          dialogConfig?.onConfirm();
          setDialogVisible(false);
        }}
        onCancel={() => setDialogVisible(false)}
        destructive={dialogConfig?.destructive}
      />
    </>
  );
}

export default memo(CardCliente);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0B1329",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  cardOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  copyFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  copyFeedbackText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
    paddingBottom: 12,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#0B1329',
  },
  avatarText: {
    color: "#3B82F6",
    fontSize: 18,
    fontWeight: "800",
  },
  nameBlock: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  nomeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    flexShrink: 1,
  },
  newBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.4)',
  },
  newBadgeText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '700',
  },
  tipoText: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 3,
  },
  destaqueVerde: {
    color: "#10B981",
    fontWeight: "700",
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  quickActionPay: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  quickActionText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  menuButton: {
    padding: 8,
  },
  detailsContainer: {
    marginTop: 12,
    gap: 8,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  dataGroup: {
    flex: 1,
  },
  dataLabel: {
    color: "#4B5563",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dataValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  receivedValue: {
    color: "#3B82F6",
  },
  debtValue: {
    color: "#EF4444",
  },
  enderecoText: {
    color: "#9CA3AF",
    fontSize: 13,
  },
  obsContainer: {
    backgroundColor: "rgba(4, 8, 20, 0.4)",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  obsText: {
    color: "#9CA3AF",
    fontSize: 12,
    lineHeight: 16,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    color: '#4B5563',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  progressText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  remainingInstallments: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '500',
  },
  dueLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  dueLabelOverdue: {
    color: '#EF4444',
  },
  financialStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  statusItem: {
    flex: 1,
  },
  statusLabel: {
    color: '#4B5563',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statusValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statusValueDebt: {
    color: '#EF4444',
  },
  statusValuePaid: {
    color: '#10B981',
  },
  daysCounter: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  daysCounterOverdue: {
    color: '#EF4444',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  menuContainer: {
    backgroundColor: '#0B1329',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    marginRight: 20,
    minWidth: 180,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
