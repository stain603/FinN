import React, { useEffect } from "react";
import {
  Text,
  StyleSheet,
  Pressable,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";

import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";

const AnimatedPressable =
  Animated.createAnimatedComponent(Pressable);

export default function ClientsCard() {
  const { metrics } = useApp();
  const { t } = useLanguage();
  
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);

  const pressScale = useSharedValue(1);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  const glowX = useSharedValue(-20);

  useEffect(() => {
    opacity.value = withDelay(
      350,
      withTiming(1, {
        duration: 700,
      })
    );

    translateY.value = withDelay(
      350,
      withSpring(0, {
        damping: 18,
        stiffness: 120,
      })
    );

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.25, {
          duration: 1200,
        }),
        withTiming(1, {
          duration: 1200,
        })
      ),
      -1
    );

    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.9, {
          duration: 1200,
        }),
        withTiming(0.35, {
          duration: 1200,
        })
      ),
      -1
    );

    glowX.value = withRepeat(
      withSequence(
        withTiming(20, {
          duration: 6000,
        }),
        withTiming(-20, {
          duration: 6000,
        })
      ),
      -1
    );
  }, []);

  const cardStyle =
    useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [
        {
          translateY:
            translateY.value,
        },
        {
          scale:
            pressScale.value,
        },
      ],
    }));

  const pulseStyle =
    useAnimatedStyle(() => ({
      opacity:
        pulseOpacity.value,

      transform: [
        {
          scale:
            pulseScale.value,
        },
      ],
    }));

  const glowStyle =
    useAnimatedStyle(() => ({
      transform: [
        {
          translateX:
            glowX.value,
        },
      ],
    }));

  // Calculate client stats
  const emDia = Math.max(0, metrics.clientesAtivos - metrics.clientesAtrasados);
  const adimplencia = Math.round(metrics.taxaAdimplencia);
  
  const isHealthy = metrics.clientesAtrasados === 0;

  return (
    <AnimatedPressable
      style={[
        styles.card,
        cardStyle,
      ]}
      onPressIn={() => {
        pressScale.value =
          withSpring(0.98);
      }}
      onPressOut={() => {
        pressScale.value =
          withSpring(1);
      }}
    >
      <Animated.View
        style={[
          styles.glow,
          glowStyle,
        ]}
      />

      <BlurView
        intensity={35}
        tint="dark"
        style={styles.content}
      >
        <View>
          <Text style={styles.label}>
            Clientes Ativos
          </Text>

          <Text style={styles.value}>
            {metrics.clientesAtivos}
          </Text>
        </View>

        <View style={styles.stats}>
          <View>
            <Text
              style={styles.statLabel}
            >
              Em dia
            </Text>

            <Text
              style={styles.good}
            >
              {emDia}
            </Text>
          </View>

          <View>
            <Text
              style={styles.statLabel}
            >
              Atrasados
            </Text>

            <Text
              style={styles.bad}
            >
              {metrics.clientesAtrasados}
            </Text>
          </View>

          <View>
            <Text
              style={styles.statLabel}
            >
              {t('filterPaid')}
            </Text>

            <Text
              style={styles.neutral}
            >
              {metrics.clientesQuitados}
            </Text>
          </View>

          <View>
            <Text
              style={styles.statLabel}
            >
              Adimplência
            </Text>

            <Text
              style={styles.percent}
            >
              {adimplencia}%
            </Text>
          </View>
        </View>

        <View style={styles.trendRow}>
          {metrics.clientesAtrasados > 0 ? (
            <>
              <Ionicons name="trending-down" size={14} color="#EF4444" />
              <Text style={styles.trendBad}>
                {metrics.clientesAtrasados} {t('filterOverdue')}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="trending-up" size={14} color="#22C55E" />
              <Text style={styles.trendGood}>{t('allUpToDate')}</Text>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Animated.View
            style={[
              styles.pulse,
              { backgroundColor: isHealthy ? "#22C55E" : "#EF4444" },
              pulseStyle,
            ]}
          />

          <Text
            style={[styles.footerText, { color: isHealthy ? "#4ADE80" : "#F87171" }]}
          >
            {isHealthy ? 'Carteira saudável' : 'Atenção necessária'}
          </Text>
        </View>
      </BlurView>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 180,

    borderRadius: 30,

    overflow: "hidden",

    backgroundColor:
      "rgba(15,23,42,0.9)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.05)",
  },

  content: {
    flex: 1,

    padding: 22,

    justifyContent:
      "space-between",
  },

  label: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },

  value: {
    color: "#FFF",
    fontSize: 42,
    fontWeight: "800",
    marginTop: 4,
  },

  stats: {
    flexDirection: "row",
    justifyContent:
      "space-between",
  },

  statLabel: {
    color: "#64748B",
    fontSize: 12,
    marginBottom: 4,
  },

  good: {
    color: "#22C55E",
    fontSize: 18,
    fontWeight: "700",
  },

  bad: {
    color: "#EF4444",
    fontSize: 18,
    fontWeight: "700",
  },

  neutral: {
    color: "#94A3B8",
    fontSize: 18,
    fontWeight: "700",
  },

  percent: {
    color: "#60A5FA",
    fontSize: 18,
    fontWeight: "700",
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
  },

  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },

  trendGood: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '600',
  },

  trendBad: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
  },

  pulse: {
    width: 10,
    height: 10,

    borderRadius: 999,

    marginRight: 10,
  },

  footerText: {
    fontSize: 13,
    fontWeight: "600",
  },

  glow: {
    position: "absolute",

    width: 220,
    height: 220,

    borderRadius: 999,

    backgroundColor:
      "rgba(139,92,246,0.18)",

    top: -80,
    right: -50,
  },
});
