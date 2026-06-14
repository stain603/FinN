import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StatusBar 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Tipagem para os Clientes da plataforma
interface Cliente {
  id: string;
  nome: string;
  empresa: string;
  status: "Ativo" | "Inativo";
  valor: string;
}

export default function Costumer() {
  const [busca, setBusca] = useState("");

  // Dados fictícios baseados no ecossistema financeiro/gestão do app
  const [clientes] = useState<Cliente[]>(
    [
      { id: "1", nome: "Erick Cárdenas", empresa: "Membro Premium", status: "Ativo", valor: "R$ 1.450,00" },
      { id: "2", nome: "Ana Beatriz Silva", empresa: "Consultoria Tech", status: "Ativo", valor: "R$ 890,00" },
      { id: "3", nome: "Marcos Oliveira", empresa: "Logística Express", status: "Inativo", valor: "R$ 0,00" },
      { id: "4", nome: "Letícia Cavalcanti", empresa: "Design Studio", status: "Ativo", valor: "R$ 3.200,00" },
      { id: "5", nome: "Roberto Mendes", empresa: "Fábrica de Softwares", status: "Ativo", valor: "R$ 5.000,00" },
    ]
  );

  // Filtragem em tempo real
  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(busca.toLowerCase()) ||
    cliente.empresa.toLowerCase().includes(busca.toLowerCase())
  );

  const renderClienteCard = ({ item }: { item: Cliente }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        {/* Avatar redondo estilizado */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.nome.charAt(0)}</Text>
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.clienteNome}>{item.nome}</Text>
          <Text style={styles.clienteEmpresa}>{item.empresa}</Text>
        </View>
      </View>

      <View style={styles.cardRight}>
        <Text style={styles.clienteValor}>{item.valor}</Text>
        <View style={[
          styles.statusBadge, 
          item.status === "Ativo" ? styles.statusAtivo : styles.statusInativo
        ]}>
          <Text style={[
            styles.statusText,
            item.status === "Ativo" ? styles.statusTextAtivo : styles.statusTextInativo
          ]}>
            {item.status}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Cabeçalho Premium */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Meus Clientes</Text>
          <Text style={styles.subtitle}>{clientes.length} contatos registrados</Text>
        </View>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.7}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Barra de Busca Dinâmica */}
      <View style={styles.searchSection}>
        <Ionicons style={styles.searchIcon} name="search" size={18} color="#6B7280" />
        <TextInput
          style={styles.input}
          placeholder="Buscar por nome ou empresa..."
          placeholderTextColor="#4B5563"
          value={busca}
          onChangeText={setBusca}
          underlineColorAndroid="transparent"
        />
      </View>

      {/* Listagem de Cartões */}
      <FlatList
        data={clientesFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={renderClienteCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#4B5563" />
            <Text style={styles.emptyText}>Nenhum cliente encontrado.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#040814", // Cor escura viva oficial do seu projeto
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  addButton: {
    backgroundColor: "#2563EB",
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B1329",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 14,
  },
  listContainer: {
    paddingBottom: 110, // Espaço extra de segurança para a Curved Bottom Tab flutuar por cima
  },
  card: {
    backgroundColor: "#0B1329",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(37, 99, 235, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.3)",
  },
  avatarText: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "700",
  },
  infoContainer: {
    flex: 1,
  },
  clienteNome: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  clienteEmpresa: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
  },
  cardRight: {
    alignItems: "flex-end",
  },
  clienteValor: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusAtivo: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  statusInativo: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextAtivo: {
    color: "#10B981",
  },
  statusTextInativo: {
    color: "#EF4444",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    color: "#4B5563",
    fontSize: 14,
    marginTop: 12,
  },
});