import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FeedbackBannerProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error';
  onHide?: () => void;
  duration?: number;
}

export default function FeedbackBanner({
  visible,
  message,
  type = 'success',
  onHide,
  duration = 2500,
}: FeedbackBannerProps) {
  useEffect(() => {
    if (!visible || !onHide) return;
    const timer = setTimeout(onHide, duration);
    return () => clearTimeout(timer);
  }, [visible, onHide, duration]);

  if (!visible) return null;

  const isSuccess = type === 'success';

  return (
    <View style={[styles.banner, isSuccess ? styles.success : styles.error]}>
      <Ionicons
        name={isSuccess ? 'checkmark-circle' : 'alert-circle'}
        size={18}
        color={isSuccess ? '#10B981' : '#EF4444'}
      />
      <Text style={styles.text} numberOfLines={2}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  success: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  text: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
