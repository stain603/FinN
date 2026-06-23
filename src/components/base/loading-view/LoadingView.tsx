import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface LoadingViewProps {
  message?: string;
  backgroundColor?: string;
}

export default function LoadingView({
  message = 'Carregando...',
  backgroundColor = '#060b13',
}: LoadingViewProps) {
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '500',
  },
});
