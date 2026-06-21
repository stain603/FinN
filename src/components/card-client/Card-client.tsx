import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Linking,
  Modal,
  ScrollView 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import ConfirmDialog from "@/components/base/confirm-dialog";
import { formatCurrency } from "@/services/financialMetrics";

// Contrato de dados que o card precisa receber para se montar sozinho
interface CardClienteProps {
  nome: string;
  telefone: string;
  endereco?: string;
  valorEmprestado: string;
  valorTotalReceber: string;
  valorParcela: string;
  frequencia: "Diário" | "Semanal" | "Mensal" | "Anual";
  observacao?: string;
  onDelete?: () => void;
  onEdit?: () => void;
  onMarkPayment?: () => void;
  onViewHistory?: () => void;
  // Campos calculados
  lucroEsperado?: number;
  valorRecebido?: number;
  parcelasTotais?: number;
  parcelasPagas?: number;
  parcelasRestantes?: number;
  saldoDevedor?: number;
  proximoVencimento?: string;
  status?: "ativo" | "pendente" | "atrasado" | "quitado" | "cancelado";
}

export default function CardCliente({
  nome,
  telefone,
  endereco,
  valorEmprestado,
  valorTotalReceber,
  valorParcela,
  frequencia,
  observacao,
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
  onViewHistory
}: CardClienteProps) {

  const { t } = useLanguage();
  const [menuVisible, setMenuVisible] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    destructive?: boolean;
  } | null>(null);

  // Determine status color
  const getStatusColor = () => {
    if (status === 'quitado') return '#3B82F6'; // Blue
    if (status === 'atrasado') return '#EF4444'; // Red
    if (status === 'cancelado') return '#6B7280'; // Gray
    
    // Check if due today
    if (proximoVencimento) {
      const dueDate = new Date(proximoVencimento);
      const today = new Date();
      if (dueDate.toDateString() === today.toDateString()) {
        return '#F59E0B'; // Yellow
      }
      // Check if overdue
      if (dueDate < today && saldoDevedor && saldoDevedor > 0) {
        return '#EF4444'; // Red
      }
    }
    
    return '#10B981'; // Green - Em dia
  };

  const statusColor = getStatusColor();

  const percentComplete =
    parcelasTotais && parcelasTotais > 0 && parcelasPagas !== undefined
      ? Math.round((parcelasPagas / parcelasTotais) * 100)
      : 0;

  // Função que dispara o WhatsApp nativo com o link dinâmico wa.me
  const abrirWhatsApp = () => {
    // Remove qualquer caractere que não seja número do telefone (segurança simples)
    const telefoneLimpo = telefone.replace(/\D/g, "");
    
    // Se o usuário não digitou o código do país (55 para Brasil), nós adicionamos automaticamente
    const telefoneFormatado = telefoneLimpo.startsWith("55") ? telefoneLimpo : `55${telefoneLimpo}`;

    // Mensagem padrão premium que o sistema vai preencher para o seu usuário
    const mensagem = `Olá ${nome}! Passando para lembrar sobre o seu pagamento da parcela de ${valorParcela} (${frequencia}) referente ao serviço contratado.`;
    
    // Cria o link oficial da API do WhatsApp
    const url = `https://wa.me/${telefoneFormatado}?text=${encodeURIComponent(mensagem)}`;

    // Comando nativo que funciona tanto em aplicativos instalados (Android/iOS) quanto na Web
    Linking.openURL(url).catch(() => {
      setDialogConfig({
        title: t('error'),
        message: t('whatsappError'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
    });
  };

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

  return (
    <>
    <View style={styles.card}>
      {/* Linha Superior: Avatar, Nome e Botão de Ação */}
      <View style={styles.headerRow}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{nome.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>
          <View style={styles.nameBlock}>
            <Text style={styles.nomeText} numberOfLines={1}>{nome}</Text>
            <Text style={styles.tipoText}>{frequencia} • Parcela: <Text style={styles.destaqueVerde}>{valorParcela}</Text></Text>
          </View>
        </View>

        {/* Botão de menu */}
        <TouchableOpacity 
          style={styles.menuButton} 
          activeOpacity={0.7}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Meio do Card: Valores e Endereço */}
      <View style={styles.detailsContainer}>
        <View style={styles.dataRow}>
          <View style={styles.dataGroup}>
            <Text style={styles.dataLabel}>{t('loaned')}</Text>
            <Text style={styles.dataValue}>{valorEmprestado}</Text>
          </View>

          <View style={styles.dataGroup}>
            <Text style={styles.dataLabel}>{t('toReceive')}</Text>
            <Text style={styles.dataValue}>{valorTotalReceber}</Text>
          </View>
        </View>

        <View style={styles.dataRow}>
          {lucroEsperado !== undefined && (
            <View style={styles.dataGroup}>
              <Text style={styles.dataLabel}>{t('profit')}</Text>
              <Text style={[styles.dataValue, styles.profitValue]}>{formatCurrency(lucroEsperado)}</Text>
            </View>
          )}

          {valorRecebido !== undefined && (
            <View style={styles.dataGroup}>
              <Text style={styles.dataLabel}>{t('received')}</Text>
              <Text style={[styles.dataValue, styles.receivedValue]}>{formatCurrency(valorRecebido)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Linha de Progresso e Status Financeiro */}
      {(parcelasTotais !== undefined && parcelasPagas !== undefined) && (
        <View style={styles.progressContainer}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>{t('progress')}</Text>
            <Text style={styles.progressText}>
              {parcelasPagas} / {parcelasTotais} {t('installments')} • {percentComplete}% {t('completed')}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${Math.min(100, percentComplete)}%` }
              ]} 
            />
          </View>
          {parcelasRestantes !== undefined && (
            <Text style={styles.remainingInstallments}>
              {parcelasRestantes} {t('remainingInstallments')}
            </Text>
          )}
        </View>
      )}

      {/* Saldo Devedor e Próximo Vencimento */}
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
              <Text style={styles.statusValue}>
                {new Date(proximoVencimento).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Rodapé do Card: Observações (só aparece se o usuário tiver digitado algo) */}
      {observacao ? (
        <View style={styles.obsContainer}>
          <Text style={styles.obsText} numberOfLines={2}>
            <Text style={{ fontWeight: "700", color: "#6B7280" }}>{t('observations')}: </Text>
            {observacao}
          </Text>
        </View>
      ) : null}
    </View>

    {/* Menu Modal */}
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
          {onMarkPayment && (
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); onMarkPayment(); }}>
              <Ionicons name="cash-outline" size={20} color="#10B981" />
              <Text style={styles.menuItemText}>{t('markPayment')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); abrirWhatsApp(); }}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            <Text style={styles.menuItemText}>WhatsApp</Text>
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0B1329", // Cor escura dos cards premium
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
    backgroundColor: "rgba(37, 99, 235, 0.12)", // Fundo azul translúcido
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
  nomeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  tipoText: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 3,
  },
  destaqueVerde: {
    color: "#10B981", // Valor da parcela em verde neon discreto
    fontWeight: "700",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  paymentButton: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  historyButton: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  deleteButton: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  whatsappButton: {
    backgroundColor: "#10B981", // Verde do WhatsApp
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
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
  profitValue: {
    color: "#10B981",
  },
  receivedValue: {
    color: "#3B82F6",
  },
  enderecoText: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "right",
    maxWidth: "100%",
  },
  obsContainer: {
    backgroundColor: "rgba(4, 8, 20, 0.4)", // Caixa cinza escura para as observações
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
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  remainingInstallments: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
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
  menuButton: {
    padding: 8,
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
