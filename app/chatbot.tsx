import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from "react-native";

const exampleSuggestions = [
  "¿Cuáles son las evoluciones de Pikachu?",
  "¿Dime datos curiosos de Bulbasaur?",
  "Explícame el tipo dragón",
  "Cómo armar un equipo balanceado para Kanto",
];

export default function Chatbot() {
  const [prompt, setPrompt] = useState("");
  const [responseText, setResponseText] = useState("");
  const [typingText, setTypingText] = useState("");
  const [responseImage, setResponseImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
  const MODEL = "gemini-2.0-flash";
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  // Efecto “escribiendo” rápido
  useEffect(() => {
    if (!loading && responseText) {
      setTypingText("");
      let i = 0;
      let cancel = false;
      const step = () => {
        if (cancel) return;
        setTypingText(responseText.slice(0, i));
        if (i < responseText.length) {
          i += 3;                 // ~3 caracteres por tick
          setTimeout(step, 15);   // 15 ms por tick => rápido
        } else {
          setTypingText(responseText);
        }
      };
      step();
      return () => { cancel = true; };
    }
  }, [loading, responseText]);

  const sendPrompt = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setErrorMsg("");
    setResponseText("");
    setTypingText("");
    setResponseImage(null);

    try {
      const wantsImage =
        prompt.toLowerCase().includes("generar imagen") ||
        prompt.toLowerCase().includes("dibuja") ||
        prompt.toLowerCase().includes("imagen");

      if (wantsImage) {
        // Mantengo tu rama por si luego activas imágenes; ahora devolverá mensaje
        setErrorMsg("La generación de imágenes está desactivada por ahora.");
      } else {
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

  const handleSuggestion = (text: string) => setPrompt(text);

  // Render inline muy simple: **negrita** y *itálica*
  const Inline = ({ text }: { text: string }) => {
    const segments = useMemo(() => {
      // Separa por bold/italic sin romper demasiado
      const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
      return parts.map((p) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return { kind: "bold", value: p.slice(2, -2) } as const;
        }
        if (p.startsWith("*") && p.endsWith("*")) {
          return { kind: "italic", value: p.slice(1, -1) } as const;
        }
        return { kind: "text", value: p } as const;
      });
    }, [text]);

    return (
      <Text className="text-black">
        {segments.map((s, idx) => {
          if (s.kind === "bold") return <Text key={idx} style={{ fontWeight: "bold" }}>{s.value}</Text>;
          if (s.kind === "italic") return <Text key={idx} style={{ fontStyle: "italic" }}>{s.value}</Text>;
          return <Text key={idx}>{s.value}</Text>;
        })}
      </Text>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-red-500 p-4">
      <Text className="text-white text-2xl font-bold mb-4 text-center">Chat Pokémon</Text>

      <View className="flex-row mb-3 flex-wrap gap-2">
        {exampleSuggestions.map((sug, idx) => (
          <TouchableOpacity key={idx} onPress={() => handleSuggestion(sug)} className="bg-white/20 rounded-full px-3 py-1">
            <Text className="text-white text-xs font-medium">{sug}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        value={prompt}
        onChangeText={setPrompt}
        placeholder="Escribe tu pregunta…"
        placeholderTextColor="#ddd"
        multiline
        className="bg-white/80 rounded-xl p-3 min-h-[80px] text-black mb-3"
      />

      <TouchableOpacity onPress={sendPrompt} disabled={loading} className={`rounded-xl py-3 mb-4 items-center ${loading ? "bg-pink-400/60" : "bg-pink-600"}`}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Enviar</Text>}
      </TouchableOpacity>

      {errorMsg ? <Text className="text-red-400 mb-3 text-center">{errorMsg}</Text> : null}

      <ScrollView className="flex-1 bg-white rounded-xl p-4">
        {loading && !responseText ? (
          <Text className="text-gray-600 italic text-center">La IA está escribiendo…</Text>
        ) : null}

        {/* Respuesta de texto con efecto escribiendo y negritas/itálicas */}
        {typingText ? <Inline text={typingText} /> : null}

        {/* Mantengo tu render de imagen (aunque ahora no se usa) */}
        {responseImage ? (
          <Image source={{ uri: responseImage }} className="w-full h-80 rounded-xl mt-4" resizeMode="contain" />
        ) : null}

        {!typingText && !responseImage && !loading && (
          <Text className="text-gray-400 text-center mt-10">Aquí aparecerán las respuestas del chat</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}