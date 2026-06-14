import React, { useEffect, useState } from "react";
import {
  Text,
  StyleSheet,
  Pressable,
  View,
} from "react-native";

import { BlurView } from "expo-blur";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withDelay,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const AnimatedPressable =
  Animated.createAnimatedComponent(Pressable);

export default function ReceivableCard() {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);

  const pressScale = useSharedValue(1);

  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.15);

  const value = useSharedValue(0);

  const [displayValue, setDisplayValue] =
    useState("R$ 0");

  useDerivedValue(() => {
    runOnJS(setDisplayValue)(
      `R$ ${Math.floor(
        value.value
      ).toLocaleString("pt-BR")}`
    );
  });

  useEffect(() => {
    opacity.value = withDelay(
      250,
      withTiming(1, {
        duration: 700,
      })
    );

    translateY.value = withDelay(
      250,
      withSpring(0, {
        damping: 18,
        stiffness: 120,
      })
    );

    value.value = withDelay(
      700,
      withTiming(184500, {
        duration: 1800,
        easing: Easing.out(Easing.cubic),
      })
    );

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, {
          duration: 1800,
        }),
        withTiming(1, {
          duration: 1800,
        })
      ),
      -1
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.28, {
          duration: 1800,
        }),
        withTiming(0.12, {
          duration: 1800,
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

  const glowStyle =
    useAnimatedStyle(() => ({
      opacity:
        glowOpacity.value,

      transform: [
        {
          scale:
            glowScale.value,
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
            A Receber
          </Text>

          <Text style={styles.value}>
            {displayValue}
          </Text>
        </View>

        <View>
          <Text style={styles.subtitle}>
            Valor total esperado
          </Text>
        </View>

        <View style={styles.footer}>
          <View
            style={styles.indicator}
          />

          <Text style={styles.footerText}>
            Recebimentos ativos
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

  subtitle: {
    color: "#64748B",
    fontSize: 12,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
  },

  indicator: {
    width: 8,
    height: 8,
    borderRadius: 999,

    backgroundColor:
      "#22C55E",

    marginRight: 8,
  },

  footerText: {
    color: "#4ADE80",
    fontSize: 12,
    fontWeight: "600",
  },

  glow: {
    position: "absolute",

    width: 170,
    height: 170,

    borderRadius: 999,

    backgroundColor:
      "rgba(34,197,94,0.25)",

    top: -30,
    right: -30,
  },
});