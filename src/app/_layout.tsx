import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { CurvedBottomTabs } from "@/components/base/curved-bottom-tabs";

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <CurvedBottomTabs {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* LOGIN */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Login",
            href: null,
          }}
        />

        {/* HOME */}
        <Tabs.Screen
          name="Home"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={22}
                color={focused ? "#FFFFFF" : "#6B7280"}
              />
            ),
          }}
        />

        {/* CLIENTES */}
        <Tabs.Screen
          name="Costumer"
          options={{
            title: "Clientes",
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "people" : "people-outline"}
                size={22}
                color={focused ? "#FFFFFF" : "#6B7280"}
              />
            ),
          }}
        />

        {/* PERFIL VIRTUAL (GATILHO DO BOTTOM SHEET) */}
        <Tabs.Screen
          name="PerfilVirtual"
          options={{
            title: "Perfil",
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={22}
                color={focused ? "#FFFFFF" : "#6B7280"}
              />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault(); // Impede o router de quebrar procurando o arquivo físico
              alert("Abrindo o seu Bottom Sheet Premium de Perfil!");
            },
          }}
        />
      </Tabs>
    </GestureHandlerRootView>
  );
}