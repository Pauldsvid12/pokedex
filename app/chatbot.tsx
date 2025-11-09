import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";

const exampleSuggestions = [
  "¿Cuáles son las evoluciones de Pikachu?",
  "¿Dime datos curiosos de Bulbasaur",
  "Generar imagen de Charizard en batalla",
  "Explícame el tipo dragón",
];

export default function Chatbot() {
  const [prompt, setPrompt] = useState("");
  const [responseText, setResponseText] = useState("");
  const [responseImage, setResponseImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
  const MODEL = "gemini-2.0-flash";
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const sendPrompt = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setErrorMsg("");
    setResponseText("");
    setResponseImage(null);

    try {
      // Detectar si el usuario quiere generar imagen (puedes mejorar esta lógica)
      const wantsImage = prompt.toLowerCase().includes("generar imagen") || prompt.toLowerCase().includes("dibuja") || prompt.toLowerCase().includes("imagen");

      if (wantsImage) {
        // Aquí llamas una API de generación de imágenes si tienes (ejemplo, modelo demontrado en Google Gemini)
        // Ejemplo de body para imagen (adaptar según docs reales de API)
        const imageResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/image-alpha-001:generateImage?key=${API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt,
            size: "1024x1024", // o 512x512
          }),
        });
        const data = await imageResponse.json();
        const imageUrl = data?.artifacts?.[0]?.imageUri || null;
        if (!imageUrl) {
          setErrorMsg("No se pudo generar la imagen");
          setLoading(false);
          return;
        }
        setResponseImage(imageUrl);
      } else {
        // Petición para texto
        const res = await fetch(URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
          }),
        });

        const data = await res.json();
        const blocked = data?.promptFeedback?.blockReason;
        if (blocked) {
          setErrorMsg(`Prompt bloqueado por seguridad: ${blocked}`);
          setLoading(false);
          return;
        }
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!text) {
          setErrorMsg("No se recibió texto del modelo.");
          setLoading(false);
          return;
        }
        setResponseText(text);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (text: string) => {
    setPrompt(text);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-red-500 p-4">
      <Text className="text-white text-2xl font-bold mb-4 text-center">Chat Pokémon</Text>
      <View className="flex-row mb-3 space-x-2">
        {exampleSuggestions.map((sug, idx) => (
          <TouchableOpacity key={idx} onPress={() => handleSuggestion(sug)} className="bg-white/20 rounded-full px-3 py-1">
            <Text className="text-white text-xs font-medium">{sug}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        value={prompt}
        onChangeText={setPrompt}
        placeholder="Escribe tu pregunta o pide una imagen..."
        placeholderTextColor="#ddd"
        multiline
        className="bg-white/80 rounded-xl p-3 min-h-[80px] text-black mb-3"
      />
      <TouchableOpacity onPress={sendPrompt} disabled={loading} className={`rounded-xl py-3 mb-4 items-center ${loading ? "bg-pink-400/60" : "bg-pink-600"}`}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Enviar</Text>}
      </TouchableOpacity>
      {errorMsg ? <Text className="text-red-400 mb-3 text-center">{errorMsg}</Text> : null}
      <ScrollView className="flex-1 bg-white rounded-xl p-4">
        {responseText ? <Text className="text-black">{responseText}</Text> : null}
        {responseImage ? <Image source={{ uri: responseImage }} className="w-full h-80 rounded-xl mt-4" resizeMode="contain" /> : null}
        {!responseText && !responseImage && !loading && (
          <Text className="text-gray-400 text-center mt-10">Aquí aparecerán las respuestas del chat</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}