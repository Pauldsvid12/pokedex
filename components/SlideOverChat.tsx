import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions } from "react-native";
import { useCurrentPokemon } from "../context/CurrentPokemonContext";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const MODEL = "gemini-2.0-flash";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

function formatSuperscripts(text: string) {
  const map: { [k: string]: string } = {
    "0": "⁰","1": "¹","2": "²","3": "³","4": "⁴",
    "5": "⁵","6": "⁶","7": "⁷","8": "⁸","9": "⁹",
    "+": "⁺","-": "⁻","=": "⁼","(": "⁽",")": "⁾",
  };
  return text.replace(/\^([0-9+\-=()]+)/g, (_, sup) => [...sup].map(c => map[c] || c).join(""));
}

export default function SlideOverChat() {
  const { chatOpen, setChatOpen, current } = useCurrentPokemon();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [answer, setAnswer] = useState("");

  const sysContext = useMemo(() => {
    if (!current.name) return "";
    const types = current.types.join(", ") || "desconocido";
    return `Contexto de pantalla:\n- Pokemon visible: ${current.name}\n- ID: ${current.id}\n- Tipos: ${types}\n\nInstrucciones:\n- Si el usuario pregunta sin especificar el nombre (ej. "¿cuáles son sus debilidades?"), asume que se refiere al Pokémon visible en pantalla.\n- Responde breve (3-6 viñetas) y claro.`;
  }, [current]);

  const halfHeight = Math.round(Dimensions.get("window").height * 0.5);

  const send = async () => {
    if (!prompt.trim()) return;
    if (!API_KEY) { setErrorMsg("Falta EXPO_PUBLIC_GEMINI_API_KEY en .env"); return; }
    setLoading(true);
    setErrorMsg("");
    setAnswer("");

    try {
      const parts = [];
      if (sysContext) parts.push({ text: sysContext });
      parts.push({ text: `Usuario: ${prompt}` });

      const res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts }] }),
      });
      const data = await res.json();
      const blocked = data?.promptFeedback?.blockReason;
      if (blocked) throw new Error(`Prompt bloqueado: ${blocked}`);
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      setAnswer(formatSuperscripts(text));
    } catch (e: any) {
      setErrorMsg(e?.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  // Oculto si está cerrado
  if (!chatOpen) return null;

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: halfHeight,
        backgroundColor: "#111827",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 12,
        elevation: 24,
      }}
    >
      <View style={{ alignItems: "center", marginBottom: 6 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#6b7280" }} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={{ color: "white", fontWeight: "800", fontSize: 18 }}>IA en pantalla</Text>
        <TouchableOpacity onPress={() => setChatOpen(false)}>
          <Text style={{ color: "#fca5a5", fontWeight: "700" }}>Cerrar</Text>
        </TouchableOpacity>
      </View>

      {current.name ? (
        <Text style={{ color: "#e5e7eb", marginBottom: 8 }}>
          Contexto: {current.name} {current.types.length ? `(${current.types.join(", ")})` : ""} — id {current.id}
        </Text>
      ) : (
        <Text style={{ color: "#e5e7eb", marginBottom: 8 }}>Contexto: sin Pokémon visible</Text>
      )}

      <View style={{ backgroundColor: "white", borderRadius: 12, padding: 8, marginBottom: 8, flexDirection: "row" }}>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Pregunta aquí… (ej. ¿cuáles son sus debilidades?)"
          placeholderTextColor="#9ca3af"
          multiline
          style={{ flex: 1, color: "#111827", minHeight: 48 }}
        />
        <TouchableOpacity onPress={send} disabled={loading} style={{ marginLeft: 8, alignSelf: "center", backgroundColor: "#ef4444", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 }}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "white", fontWeight: "800" }}>Enviar</Text>}
        </TouchableOpacity>
      </View>

      {errorMsg ? <Text style={{ color: "#fecaca", marginBottom: 6, textAlign: "center" }}>{errorMsg}</Text> : null}

      <ScrollView style={{ flex: 1, backgroundColor: "#111827" }}>
        {answer ? <Text style={{ color: "white", lineHeight: 22 }}>{answer}</Text> : <Text style={{ color: "#9ca3af", textAlign: "center", marginTop: 12 }}>La respuesta aparecerá aquí…</Text>}
      </ScrollView>
    </View>
  );
}