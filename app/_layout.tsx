import { Stack } from "expo-router";
import { CurrentPokemonProvider, useCurrentPokemon } from "../context/CurrentPokemonContext";
import SlideOverChat from "../components/SlideOverChat";
import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import "../global.css";
function GlobalChatButton() {
  const { chatOpen, setChatOpen } = useCurrentPokemon();
  return (
    <View style={{ position: "absolute", left: 16, bottom: 16, zIndex: 50 }}>
      <TouchableOpacity
        onPress={() => setChatOpen(!chatOpen)}
        style={{ backgroundColor: "white", padding: 14, borderRadius: 28, elevation: 6 }}
      >
        <Ionicons name={chatOpen ? "chevron-down" : "chatbubble-ellipses"} size={24} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  return (
    <CurrentPokemonProvider>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
        <SlideOverChat />
        <GlobalChatButton />
      </View>
    </CurrentPokemonProvider>
  );
}