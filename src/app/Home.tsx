import React, { useState } from "react";
import { View, StyleSheet, Text, ScrollView } from "react-native";
import { AnimatedThemeToggle } from "../components/micro-interactions/animated-theme-toggle";
import BentoGrid from "../components/organisms/bento-grid";
import LoanedCard from "../components/organisms/bento-grid/LoanedeCard";
import ReceivableCard from "../components/organisms/bento-grid/ReceivableCard";
import ClientsCard from "../components/organisms/bento-grid/ClientCard";

export default function Home() {
  const [isDark, setIsDark] = useState(true);
  const [nomeUsuario, setNomeUsuario] = useState("Desenvolvedor");

  // Formatação da data atual por extenso
  const obterDataExtenso = () => {
    const opcoes: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    return new Date().toLocaleDateString('pt-BR', opcoes);
  };

  // Mocks das listas operacionais
  const clientesAtrasados = [
    { id: "1", nome: "Carlos Henrique", dias: 4, valor: "R$ 250,00" },
    { id: "2", nome: "Ana Maria Souza", dias: 12, valor: "R$ 1.100,00" },
  ];

  const clientesHoje = [
    { id: "3", nome: "Marcos Viana", horario: "Até às 18h", valor: "R$ 400,00" },
    { id: "4", nome: "Juliana Ribeiro", horario: "Pago", valor: "R$ 150,00" },
  ];

  // Função simples para gerenciar cliques nos botões da barra inferior
  const tratarCliqueNaAba = (nomeDaAba: string) => {
    console.log("Aba selecionada:", nomeDaAba);
    if (nomeDaAba === "Perfil") {
      alert("Ação do Perfil disparada de forma limpa!");
    }
  };

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
            <Text style={styles.welcomeText}>Olá, tudo bem, {nomeUsuario}?</Text>
            <Text style={styles.dateText}>{obterDataExtenso()}</Text>
          </View>

          <AnimatedThemeToggle
            isDark={isDark}
            onToggle={() => setIsDark(!isDark)}
            size={24}
            color="#fff"
            strokeWidth={1.5}
          />
        </View>

        {/* ─── 2. BENTO GRID ─── */}
        <View style={styles.bentoSection}>
          <BentoGrid />
          <View style={styles.rowCards}>
            <LoanedCard />
            <ReceivableCard />
          </View>
          <ClientsCard />
        </View>

        {/* ─── 3. LISTAS DE FLUXO ─── */}
        <View style={styles.listsContainer}>
          
          {/* LISTA A: CLIENTES ATRASADOS */}
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Clientes atrasados</Text>
            {clientesAtrasados.map(c => (
              <View key={c.id} style={styles.customerCard}>
                <View>
                  <Text style={styles.customerName}>{c.nome}</Text>
                  <Text style={styles.customerMeta}>Atrasado há {c.dias} dias</Text>
                </View>
                <Text style={styles.customerValue}>{c.valor}</Text>
              </View>
            ))}
          </View>

          {/* LISTA B: CLIENTES QUE PAGAM HOJE */}
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Pagam hoje</Text>
            {clientesHoje.map(c => (
              <View key={c.id} style={styles.customerCard}>
                <View>
                  <Text style={styles.customerName}>{c.nome}</Text>
                  <Text style={styles.customerMeta}>{c.horario}</Text>
                </View>
                <Text style={styles.customerValue}>{c.valor}</Text>
              </View>
            ))}
          </View>

        </View>
      </ScrollView>

   
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060b13", 
  },
  scrollContent: {
    backgroundColor: "#060b13", 
    paddingHorizontal: 20,
    paddingBottom: 110, // Abre espaço na base para o conteúdo rolar acima da barra
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 65,
    marginBottom: 30,
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
});