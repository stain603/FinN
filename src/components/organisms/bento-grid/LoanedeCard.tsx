import React, { useEffect, useState } from "react";
import {
  Text,
  StyleSheet,
  Pressable,
  View,
} from "react-native";

import { BlurView } from "expo-blur";

import Svg, {
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";

import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency } from "@/services/financialMetrics";

const AnimatedPressable =
  Animated.createAnimatedComponent(Pressable);

export default function LoanedCard() {
  const { metrics, isLoading } = useApp();
  const { t } = useLanguage();
  
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);

  const pressScale = useSharedValue(1);

  const glowX = useSharedValue(-30);

  const value = useSharedValue(0);

  const [displayValue, setDisplayValue] =
    useState("R$ 0");

  // Use useEffect to update displayValue when value changes
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayValue(formatCurrency(Math.floor(value.value)));
    }, 16); // ~60fps
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    opacity.value = withDelay(
      150,
      withTiming(1, {
        duration: 700,
      })
    );

    translateY.value = withDelay(
      150,
      withSpring(0, {
        damping: 18,
        stiffness: 120,
      })
    );

    if (!isLoading && metrics?.capitalInvestido !== undefined && metrics?.capitalInvestido !== null) {
      value.value = withDelay(
        500,
        withTiming(metrics.capitalInvestido, {
          duration: 1600,
          easing: Easing.out(Easing.cubic),
        })
      );
    }

    glowX.value = withRepeat(
      withSequence(
        withTiming(20, {
          duration: 5000,
        }),
        withTiming(-30, {
          duration: 5000,
        })
      ),
      -1
    );
  }, [metrics.capitalInvestido, isLoading]);

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

  const glowStyle =
    useAnimatedStyle(() => ({
      transform: [
        {
          translateX: glowX.value,
        },
      ],
    }));

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
            {t('valorTransito')}
          </Text>

          <Text style={styles.value}>
            {displayValue}
          </Text>
        </View>

        <Svg
          width="100%"
          height="50"
          viewBox="0 0 180 50"
        >
          <Defs>
            <SvgGradient
              id="lineGradient"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <Stop
                offset="0%"
                stopColor="#06B6D4"
              />

              <Stop
                offset="100%"
                stopColor="#3B82F6"
              />
            </SvgGradient>
          </Defs>

          <Path
            d="
              M0 35
              C20 10,40 40,60 18
              S100 5,120 20
              S150 35,180 12
            "
            stroke="url(#lineGradient)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        </Svg>

        <View style={styles.footer}>
          <Text style={styles.contracts}>
            {metrics.valorEmTransito > 0 ? `${formatCurrency(metrics.valorEmTransito)} ${t('emTransito')}` : t('semValoresTransito')}
          </Text>

          <Text style={styles.growth}>
            {metrics.carteiraTotal > 0 ? `+${((metrics.capitalInvestido / metrics.carteiraTotal) * 100).toFixed(1)}%` : '0%'}
          </Text>
        </View>
      </BlurView>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: 170,

    borderRadius: 28,

    overflow: "hidden",

    backgroundColor:
      "rgba(15,23,42,0.9)",

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.05)",
  },

  content: {
    flex: 1,
    padding: 18,
    justifyContent:
      "space-between",
  },

  label: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },

  value: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 6,
  },

  footer: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
  },

  contracts: {
    color: "#64748B",
    fontSize: 12,
  },

  growth: {
    color: "#22C55E",
    fontWeight: "700",
    fontSize: 13,
  },

  glow: {
    position: "absolute",

    width: 140,
    height: 140,

    borderRadius: 999,

    backgroundColor:
      "rgba(6,182,212,0.18)",

    right: -30,
    top: -20,
  },
});
