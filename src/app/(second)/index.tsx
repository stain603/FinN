import React, { useState, useCallback, useMemo } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CardCliente from "../../components/card-client/Card-client";
import PaymentHistoryModal from "../../components/payment-history-modal/PaymentHistoryModal";
import ConfirmDialog from "../../components/base/confirm-dialog";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Client } from "@/types";
import { useCurrencyInput } from "@/hooks/useCurrencyInput";
import { formatCurrency } from "@/services/financialMetrics";

export default function Costumer() {
  const { clients, addClient, deleteClient, updateClient, charges, markChargeAsPaid, payments, isLoading } = useApp();
  const { t } = useLanguage();
  const [busca, setBusca] = useState("");
  const [modalVisivel, setModalVisivel] = useState(false);
  const [paymentHistoryVisible, setPaymentHistoryVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    destructive?: boolean;
  } | null>(null);
  
  // ================= STATES DO FORMULÁRIO =================
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const valorEmprestadoInput = useCurrencyInput();
  const valorTotalReceberInput = useCurrencyInput();
  const valorParcelaInput = useCurrencyInput();
  const [frequencia, setFrequencia] = useState<"Diário" | "Semanal" | "Mensal" | "Anual">("Mensal");
  const [observacao, setObservacao] = useState("");

  const clientesFiltrados = useMemo(() => 
    clients.filter(cliente =>
      cliente.nome.toLowerCase().includes(busca.toLowerCase())
    ),
    [clients, busca]
  );

  const handleDeleteClient = useCallback(async (clientId: string) => {
    await deleteClient(clientId);
  }, [deleteClient]);

  const handleViewHistory = useCallback((client: Client) => {
    setSelectedClient(client);
    setPaymentHistoryVisible(true);
  }, []);

  const handleAdicionarCliente = async () => {
    // Validation
    if (!nome.trim()) {
      setDialogConfig({
        title: t('error'),
        message: t('nameRequired'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
      return;
    }
    if (!telefone.trim()) {
      setDialogConfig({
        title: t('error'),
        message: t('phoneRequired'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
      return;
    }
    if (!valorEmprestadoInput.value || valorEmprestadoInput.getNumericValue() <= 0) {
      setDialogConfig({
        title: t('error'),
        message: t('loanAmountRequired'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
      return;
    }
    if (!valorTotalReceberInput.value || valorTotalReceberInput.getNumericValue() <= 0) {
      setDialogConfig({
        title: t('error'),
        message: t('totalReceiveAmountRequired'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
      return;
    }
    if (!valorParcelaInput.value || valorParcelaInput.getNumericValue() <= 0) {
      setDialogConfig({
        title: t('error'),
        message: t('installmentAmountRequired'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
      return;
    }

    if (isEditMode && selectedClient) {
      // Update existing client
      const updatedClient: Client = {
        ...selectedClient,
        nome,
        telefone,
        endereco: endereco || undefined,
        valorEmprestado: valorEmprestadoInput.getNumericValue(),
        valorTotalReceber: valorTotalReceberInput.getNumericValue(),
        valorParcela: valorParcelaInput.getNumericValue(),
        frequencia,
        observacao: observacao || undefined,
      };

      await updateClient(updatedClient);
      setDialogConfig({
        title: t('success'),
        message: t('clientUpdated'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
    } else {
      // Add new client
      const novoCliente: Client = {
        id: Date.now().toString(),
        nome,
        telefone,
        endereco: endereco || undefined,
        valorEmprestado: valorEmprestadoInput.getNumericValue(),
        valorTotalReceber: valorTotalReceberInput.getNumericValue(),
        valorParcela: valorParcelaInput.getNumericValue(),
        frequencia,
        observacao: observacao || undefined,
        dataInicio: new Date().toISOString(),
        dataTermino: new Date().toISOString(),
        proximoVencimento: new Date().toISOString(),
        lucroEsperado: valorTotalReceberInput.getNumericValue() - valorEmprestadoInput.getNumericValue(),
        valorRecebido: 0,
        saldoDevedor: valorTotalReceberInput.getNumericValue(),
        parcelasTotais: Math.floor(valorTotalReceberInput.getNumericValue() / valorParcelaInput.getNumericValue()),
        parcelasPagas: 0,
        parcelasRestantes: Math.floor(valorTotalReceberInput.getNumericValue() / valorParcelaInput.getNumericValue()),
        status: 'ativo',
        historicoPagamentos: [],
      };

      await addClient(novoCliente);
    }
    
    // Reset form
    resetForm();
    setModalVisivel(false);
  };

  const resetForm = () => {
    setNome("");
    setTelefone("");
    setEndereco("");
    valorEmprestadoInput.onChangeText('');
    valorTotalReceberInput.onChangeText('');
    valorParcelaInput.onChangeText('');
    setFrequencia("Mensal");
    setObservacao("");
    setIsEditMode(false);
    setSelectedClient(null);
  };

  const handleEditarCliente = (client: Client) => {
    setSelectedClient(client);
    setIsEditMode(true);
    setNome(client.nome);
    setTelefone(client.telefone);
    setEndereco(client.endereco || "");
    valorEmprestadoInput.onChangeText(formatCurrency(client.valorEmprestado));
    valorTotalReceberInput.onChangeText(formatCurrency(client.valorTotalReceber));
    valorParcelaInput.onChangeText(formatCurrency(client.valorParcela));
    setFrequencia(client.frequencia);
    setObservacao(client.observacao || "");
    setModalVisivel(true);
  };

  const handleExcluirCliente = (id: string, nome: string) => {
    setDialogConfig({
      title: t('confirmDelete'),
      message: t('deleteClientMessage', { name: nome }),
      onConfirm: async () => {
        try {
          await deleteClient(id);
          setDialogConfig({
            title: t('success'),
            message: t('clientDeleted'),
            onConfirm: () => setDialogVisible(false),
          });
          setDialogVisible(true);
        } catch (error) {
          setDialogConfig({
            title: t('error'),
            message: t('deleteError'),
            onConfirm: () => setDialogVisible(false),
          });
          setDialogVisible(true);
        }
      },
      destructive: true,
    });
    setDialogVisible(true);
  };

  const handleMarcarPagamentoRapido = async (client: Client) => {
    // Encontrar a charge pendente mais recente do cliente
    const pendingCharge = charges
      .filter(c => c.clienteId === client.id && c.status === 'pendente')
      .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())[0];

    if (pendingCharge) {
      setDialogConfig({
        title: t('confirmPayment'),
        message: `${t('markPayment')} ${formatCurrency(pendingCharge.valor)} ${t('for')} ${client.nome}?`,
        onConfirm: async () => {
          try {
            await markChargeAsPaid(pendingCharge.id);
            setDialogConfig({
              title: t('success'),
              message: t('paymentRegistered'),
              onConfirm: () => setDialogVisible(false),
            });
            setDialogVisible(true);
          } catch (error) {
            setDialogConfig({
              title: t('error'),
              message: t('paymentError'),
              onConfirm: () => setDialogVisible(false),
            });
            setDialogVisible(true);
          }
        },
      });
      setDialogVisible(true);
    } else {
      setDialogConfig({
        title: t('success'),
        message: t('noPendingPaymentsClient'),
        onConfirm: () => setDialogVisible(false),
      });
      setDialogVisible(true);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('myClients')}</Text>
          <Text style={styles.subtitle}>{clientesFiltrados.length} {t('activeContracts')}</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton} 
          activeOpacity={0.7}
          onPress={() => { resetForm(); setModalVisivel(true); }}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Busca */}
      <View style={styles.searchSection}>
        <Ionicons style={styles.searchIcon} name="search" size={18} color="#6B7280" />
        <TextInput
          style={styles.input}
          placeholder={t('searchByName')}
          placeholderTextColor="#4B5563"
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      {/* Lista */}
      <FlatList
        data={clientesFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CardCliente 
            nome={item.nome}
            telefone={item.telefone}
            endereco={item.endereco}
            valorEmprestado={formatCurrency(item.valorEmprestado)}
            valorTotalReceber={formatCurrency(item.valorTotalReceber)}
            valorParcela={formatCurrency(item.valorParcela)}
            frequencia={item.frequencia}
            observacao={item.observacao}
            lucroEsperado={item.lucroEsperado}
            valorRecebido={item.valorRecebido}
            parcelasTotais={item.parcelasTotais}
            parcelasPagas={item.parcelasPagas}
            saldoDevedor={item.saldoDevedor}
            proximoVencimento={item.proximoVencimento}
            status={item.status}
            onDelete={() => handleExcluirCliente(item.id, item.nome)}
            onEdit={() => handleEditarCliente(item)}
            onMarkPayment={() => handleMarcarPagamentoRapido(item)}
            onViewHistory={() => handleViewHistory(item)}
          />
        )}
        contentContainerStyle={styles.listContainer}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyStateTitle}>{t('noClientsFound')}</Text>
            <Text style={styles.emptyStateSubtitle}>
              {busca ? t('tryAnotherSearch') : t('addFirstClient')}
            </Text>
          </View>
        }
      />

      {/* ==================== MODAL DE CADASTRO ==================== */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisivel}
        onRequestClose={() => setModalVisivel(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditMode ? t('editClient') : t('newContract')}</Text>
              <TouchableOpacity onPress={() => { resetForm(); setModalVisivel(false); }} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              
              <Text style={styles.label}>{t('fullName')}</Text>
              <View style={styles.inputContainer}>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder={t('clientNamePlaceholder')} 
                  placeholderTextColor="#4B5563"
                  value={nome}
                  onChangeText={setNome}
                />
              </View>

              <Text style={styles.label}>{t('whatsappNumber')}</Text>
              <View style={styles.inputContainer}>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder={t('whatsappPlaceholder')} 
                  placeholderTextColor="#4B5563"
                  keyboardType="phone-pad"
                  value={telefone}
                  onChangeText={setTelefone}
                />
              </View>

              <Text style={styles.label}>{t('address')} <Text style={styles.labelOpcional}>{t('addressOptional')}</Text></Text>
              <View style={styles.inputContainer}>
                <TextInput 
                  style={styles.modalInput} 
                  placeholder={t('addressPlaceholder')} 
                  placeholderTextColor="#4B5563"
                  value={endereco}
                  onChangeText={setEndereco}
                />
              </View>

              {/* Grid de Valores lado a lado para economizar espaço */}
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{t('loanAmount')}</Text>
                  <View style={styles.inputContainer}>
                    <TextInput 
                      style={styles.modalInput} 
                      placeholder={t('currencyPlaceholder')} 
                      placeholderTextColor="#4B5563"
                      keyboardType="numeric"
                      value={valorEmprestadoInput.value}
                      onChangeText={valorEmprestadoInput.onChangeText}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{t('totalReceive')}</Text>
                  <View style={styles.inputContainer}>
                    <TextInput 
                      style={styles.modalInput} 
                      placeholder={t('currencyPlaceholder')} 
                      placeholderTextColor="#4B5563"
                      keyboardType="numeric"
                      value={valorTotalReceberInput.value}
                      onChangeText={valorTotalReceberInput.onChangeText}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{t('installmentValue')}</Text>
                  <View style={styles.inputContainer}>
                    <TextInput 
                      style={styles.modalInput} 
                      placeholder={t('currencyPlaceholder')} 
                      placeholderTextColor="#4B5563"
                      keyboardType="numeric"
                      value={valorParcelaInput.value}
                      onChangeText={valorParcelaInput.onChangeText}
                    />
                  </View>
                </View>
              </View>

              {/* Seletor do Tipo de Frequência de Pagamento */}
              <Text style={styles.label}>{t('paymentFrequency')}</Text>
              <View style={styles.freqContainer}>
                {([
                  { key: 'Diário', label: t('daily') },
                  { key: 'Semanal', label: t('weekly') },
                  { key: 'Mensal', label: t('monthly') },
                  { key: 'Anual', label: t('yearly') }
                ] as const).map((freq) => (
                  <TouchableOpacity
                    key={freq.key}
                    style={[styles.freqOption, frequencia === freq.key && styles.freqOptionActive]}
                    onPress={() => setFrequencia(freq.key)}
                  >
                    <Text style={[styles.freqText, frequencia === freq.key && styles.freqTextActive]}>
                      {freq.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>{t('observations')}</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput 
                  style={[styles.modalInput, { textAlignVertical: "top" }]} 
                  placeholder={t('observationsPlaceholder')} 
                  placeholderTextColor="#4B5563"
                  multiline={true}
                  numberOfLines={3}
                  value={observacao}
                  onChangeText={setObservacao}
                />
              </View>

              <TouchableOpacity 
                style={styles.btnSalvar}
                activeOpacity={0.8}
                onPress={handleAdicionarCliente}
              >
                <Text style={styles.btnSalvarText}>{isEditMode ? t('save') : t('createAndMountCard')}</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Payment History Modal */}
      <PaymentHistoryModal
        visible={paymentHistoryVisible}
        onClose={() => setPaymentHistoryVisible(false)}
        payments={selectedClient ? payments.filter(p => p.clienteId === selectedClient.id) : []}
        clientName={selectedClient?.nome || ''}
        client={selectedClient || undefined}
        isLoading={isLoading}
      />

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

    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#040814",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFF",
    fontSize: 16,
  },
  container: { flex: 1, backgroundColor: "#040814", paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 26, fontWeight: "800", color: "#FFFFFF" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  addButton: { backgroundColor: "#2563EB", width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  searchSection: { flexDirection: "row", alignItems: "center", backgroundColor: "#0B1329", borderRadius: 14, paddingHorizontal: 14, marginBottom: 20, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.06)" },
  searchIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, color: "#FFFFFF" },
  listContainer: { paddingBottom: 110 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyStateSubtitle: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
  },
  
  /* STYLES DO MODAL */
  modalOverlay: { flex: 1, backgroundColor: "rgba(4, 8, 20, 0.8)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#0B1329", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, maxHeight: "90%", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.06)" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  closeButton: { backgroundColor: "rgba(255, 255, 255, 0.03)", width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  label: { color: "#9CA3AF", fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 4 },
  labelOpcional: { color: "#4B5563", fontSize: 11, fontWeight: "400" },
  inputContainer: { backgroundColor: "#040814", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.05)", paddingHorizontal: 14, marginBottom: 14 },
  modalInput: { color: "#FFFFFF", paddingVertical: 12, fontSize: 14, width: "100%" },
  rowInputs: { flexDirection: "row", gap: 12 },
  freqContainer: { flexDirection: "row", backgroundColor: "#040814", borderRadius: 12, padding: 4, gap: 4, marginBottom: 14, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.05)" },
  freqOption: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  freqOptionActive: { backgroundColor: "#2563EB" },
  freqText: { color: "#4B5563", fontSize: 12, fontWeight: "700" },
  freqTextActive: { color: "#FFFFFF" },
  textAreaContainer: { paddingVertical: 4 },
  btnSalvar: { backgroundColor: "#2563EB", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 12 },
  btnSalvarText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
