import React, { useEffect } from "react";
import {
  Text,
  StyleSheet,
  Pressable,
  View,
} from "react-native";

import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";

import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency } from "@/services/financialMetrics";

const AnimatedPressable =
  Animated.createAnimatedComponent(Pressable);

const AnimatedText =
  Animated.createAnimatedComponent(Text);

export default function HeroPortfolioCard() {
  const { metrics, isLoading } = useApp();
  const { t } = useLanguage();
  
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(40);
  const cardScale = useSharedValue(0.92);

  const glow1X = useSharedValue(-50);
  const glow1Y = useSharedValue(-20);

  const glow2X = useSharedValue(40);
  const glow2Y = useSharedValue(10);

  const glow3X = useSharedValue(0);
  const glow3Y = useSharedValue(40);

  const pressScale = useSharedValue(1);

  const totalValue = useSharedValue(0);

  const [displayValue, setDisplayValue] =
    React.useState("R$ 0");

  React.useEffect(() => {
    if (isLoading) return;
    const target = metrics.carteiraTotal ?? 0;
    let current = 0;
    const steps = 40;
    const increment = Math.max(1, target / steps);
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      setDisplayValue(formatCurrency(Math.floor(current)));
      if (current >= target) clearInterval(timer);
    }, 45);
    return () => clearInterval(timer);
  }, [metrics.carteiraTotal, isLoading]);

  useEffect(() => {
    cardOpacity.value = withTiming(1, {
      duration: 700,
    });

    cardTranslateY.value = withSpring(0, {
      damping: 18,
      stiffness: 120,
    });

    cardScale.value = withSpring(1, {
      damping: 18,
      stiffness: 120,
    });

    // Animate to real value when data is loaded
    if (!isLoading && metrics?.carteiraTotal !== undefined && metrics?.carteiraTotal !== null) {
      totalValue.value = withDelay(
        300,
        withTiming(metrics.carteiraTotal, {
          duration: 1800,
          easing: Easing.out(Easing.cubic),
        })
      );
    }

    glow1X.value = withRepeat(
      withSequence(
        withTiming(30, {
          duration: 8000,
        }),
        withTiming(-50, {
          duration: 8000,
        })
      ),
      -1
    );

    glow1Y.value = withRepeat(
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

    glow2X.value = withRepeat(
      withSequence(
        withTiming(-20, {
          duration: 10000,
        }),
        withTiming(40, {
          duration: 10000,
        })
      ),
      -1
    );

    glow3Y.value = withRepeat(
      withSequence(
        withTiming(-20, {
          duration: 12000,
        }),
        withTiming(40, {
          duration: 12000,
        })
      ),
      -1
    );
  }, [metrics.carteiraTotal, isLoading]);

  const cardAnimatedStyle =
    useAnimatedStyle(() => ({
      opacity: cardOpacity.value,
      transform: [
        {
          translateY:
            cardTranslateY.value,
        },
        {
          scale:
            cardScale.value *
            pressScale.value,
        },
      ],
    }));

  const glow1Style =
    useAnimatedStyle(() => ({
      transform: [
        {
          translateX: glow1X.value,
        },
        {
          translateY: glow1Y.value,
        },
      ],
    }));

  const glow2Style =
    useAnimatedStyle(() => ({
      transform: [
        {
          translateX: glow2X.value,
        },
        {
          translateY: glow2Y.value,
        },
      ],
    }));

  const glow3Style =
    useAnimatedStyle(() => ({
      transform: [
        {
          translateX: glow3X.value,
        },
        {
          translateY: glow3Y.value,
        },
      ],
    }));

  return (
    <AnimatedPressable
      style={[
        styles.container,
        cardAnimatedStyle,
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
      <LinearGradient
        colors={[
          "#09090B",
          "#111827",
          "#0F172A",
        ]}
        start={{
          x: 0,
          y: 0,
        }}
        end={{
          x: 1,
          y: 1,
        }}
        style={styles.gradient}
      >
        {/* Aurora Layer */}

        <Animated.View
          style={[
            styles.glowGreen,
            glow1Style,
          ]}
        />

        <Animated.View
          style={[
            styles.glowBlue,
            glow2Style,
          ]}
        />

        <Animated.View
          style={[
            styles.glowCyan,
            glow3Style,
          ]}
        />

        <BlurView
          intensity={40}
          tint="dark"
          style={styles.content}
        >
          <View>
            <Text style={styles.label}>
              Carteira Total
            </Text>
          </View>

          <View>
            <Text style={styles.value}>
              {displayValue}
            </Text>

            <Text style={styles.profit}>
              Lucro esperado:
              {" "}
              {formatCurrency(metrics.lucroEsperado)}
            </Text>
          </View>

          <View style={styles.badge}>
            <View
              style={styles.badgeDot}
            />

            <Text
              style={styles.badgeText}
            >
              {metrics.recebidoSemana > 0
                ? `${formatCurrency(metrics.recebidoSemana)} ${t('receivedThisWeek')}`
                : t('noReceiptsThisWeek')}
            </Text>
          </View>
        </BlurView>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 190,
    borderRadius: 32,
    overflow: "hidden",
  },

  gradient: {
    flex: 1,
  },

  content: {
    flex: 1,
    padding: 24,
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
    letterSpacing: -2,
  },

  profit: {
    color: "#CBD5E1",
    marginTop: 6,
    fontSize: 14,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",

    paddingHorizontal: 12,
    paddingVertical: 8,

    borderRadius: 999,

    backgroundColor:
      "rgba(34,197,94,0.12)",

    borderWidth: 1,

    borderColor:
      "rgba(34,197,94,0.25)",
  },

  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#22C55E",
    marginRight: 8,
  },

  badgeText: {
    color: "#4ADE80",
    fontSize: 13,
    fontWeight: "600",
  },

  glowGreen: {
    position: "absolute",

    width: 240,
    height: 240,

    borderRadius: 999,

    backgroundColor:
      "rgba(34,197,94,0.22)",

    top: -80,
    right: -40,
  },

  glowBlue: {
    position: "absolute",

    width: 220,
    height: 220,

    borderRadius: 999,

    backgroundColor:
      "rgba(59,130,246,0.15)",

    bottom: -80,
    left: -50,
  },

  glowCyan: {
    position: "absolute",

    width: 180,
    height: 180,

    borderRadius: 999,

    backgroundColor:
      "rgba(6,182,212,0.18)",

    top: 20,
    left: 80,
  },
});
