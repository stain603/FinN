import React, { useState } from "react";
import { View, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import OtpInput from "../components/base/otp-input"; // Seu componente nativo de PIN de 4 casas

export default function Login() {
  const router = useRouter();
  
  // Troque para 'true' para simular um usuário abrindo o app pela segunda vez
  const [usuarioJaRegistrado, setUsuarioJaRegistrado] = useState(false);
  
  const [nome, setNome] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleFinalizarCadastro = () => {
    if (!nome.trim() || pin.length < 4) {
      setError(true);
      return;
    }
    setError(false);
    setUsuarioJaRegistrado(true);
    router.replace("/Home");
  };

  const handleAcessoDiretoPin = () => {
    if (pin.length < 4) {
      setError(true);
      return;
    }
    setError(false);
    router.replace("/Home");
  };

  return (
    <View style={styles.container}>
      {/* Luzes dinâmicas de fundo */}
      <View style={[styles.blurAmbient, styles.posTop]} />
      <View style={[styles.blurAmbient, styles.posBottom]} />

      <View style={styles.cardContainer}>
        
        {/* MODO 1: CADASTRO INICIAL */}
        {!usuarioJaRegistrado ? (
          <View style={styles.premiumCard}>
            <Text style={styles.title}>Faça seu cadastro</Text>
            <Text style={styles.description}>Defina suas credenciais personalizadas de acesso</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.tagLabel}>NOME DO USUÁRIO</Text>
              <TextInput
                style={styles.textInput}
                placeholder="ex: erick cardenas"
                placeholderTextColor="#4B5563"
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.tagLabel}>CRIE SEU PIN DE 4 DÍGITOS</Text>
              <View style={styles.otpWrapper}>
                <OtpInput otpCount={4} onInputChange={setPin} error={error} />
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleFinalizarCadastro}>
              <Text style={styles.submitText}>Cadastrar e Entrar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          
          /* MODO 2: USUÁRIO JÁ CADASTRADO */
          <View style={styles.premiumCard}>
            <Text style={styles.title}>Bem-vindo de volta!</Text>
            <Text style={styles.description}>Olá, {nome || "Usuário"}. Digite seu PIN para acessar.</Text>

            <View style={styles.inputGroupCenter}>
              <Text style={styles.tagLabelCenter}>INSIRA SEU PIN DE SEGURANÇA</Text>
              <View style={styles.otpWrapper}>
                <OtpInput otpCount={4} onInputChange={setPin} error={error} />
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleAcessoDiretoPin}>
              <Text style={styles.submitText}>Confirmar PIN</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={() => { setUsuarioJaRegistrado(false); setPin(""); }}
            >
              <Text style={styles.resetText}>Alternar conta de acesso</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#040814", // Fundo profundo vivo
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  blurAmbient: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#2563EB",
    opacity: 0.05,
  },
  posTop: {
    top: -70,
    right: -70,
  },
  posBottom: {
    bottom: -70,
    left: -70,
  },
  cardContainer: {
    zIndex: 5,
  },
  premiumCard: {
    backgroundColor: "#0B1329",
    padding: 26,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  description: {
    color: "#9CA3AF",
    fontSize: 14,
    marginBottom: 26,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
    width: "100%",
  },
  inputGroupCenter: {
    marginBottom: 24,
    alignItems: "center",
    width: "100%",
  },
  tagLabel: {
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  tagLabelCenter: {
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: 0.8,
  },
  textInput: {
    backgroundColor: "#040814",
    color: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
    fontSize: 15,
  },
  otpWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  submitButton: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  resetButton: {
    marginTop: 18,
    alignItems: "center",
  },
  resetText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});