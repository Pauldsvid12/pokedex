import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import PokemonStats from '../../components/ui/PokemonStats';
import { useCurrentPokemon } from '../../context/CurrentPokemonContext';
import { GoogleGenAI } from '@google/genai';

interface Pokemon {
  id: number;
  name: string;
  types: string[];
  height: number;
  weight: number;
  description: string;
  stats: { name: string; baseStat: number }[];
  cry: string;
  evolutionChain: EvolutionChain[];
  varieties: Variety[];
  artworkDefault: string | null;
  artworkShiny: string | null;
  spriteDefault: string | null;
  spriteShiny: string | null;
  animatedDefault: string | null;
  animatedShiny: string | null;
  speciesId: number;
}

interface EvolutionChain {
  id: number;
  name: string;
  sprite: string;
  types: string[];
  method: string;
}

interface Variety {
  name: string;
  sprite: string;
  types: string[];
  id: number;
  speciesId: number;
}

type ViewMode = 'artwork' | 'sprite' | 'animated';

export default function PokemonDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>('artwork');
  const [isShiny, setIsShiny] = useState(false);
  const [playingSound, setPlayingSound] = useState(false);

  const GEMINI_KEY = "AIzaSyCuIoY6RqdNcEpb4P3i1fI5uu-y9iXHAgU";
  const GEMINI_MODEL = 'gemini-2.0-flash';

  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

  const [targetLang, setTargetLang] = useState<'es' | 'en' | 'fr' | 'pt'>('es');
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);

  const { setCurrent } = useCurrentPokemon();

  useEffect(() => {
    fetchPokemonDetails();
    setViewMode('artwork');
    setIsShiny(false);
  }, [id]);

  useEffect(() => {
    if (pokemon) {
      setCurrent({ id: pokemon.id, name: pokemon.name, types: pokemon.types });
    }
  }, [pokemon]);

  const cleanFlavor = (txt: string) => {
    return txt.replace(/\f/g, ' ').replace(/\u000c/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const translateWithGemini = async (text: string, to: string) => {
    if (!GEMINI_KEY) return null;
    try {
      const prompt = `Traduce al idioma objetivo manteniendo tono enciclopédico y neutro.\nIdioma objetivo: ${to}\nTexto:\n${text}`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const out = response.text?.trim();
      return out || null;
    } catch {
      return null;
    }
  };

  const fetchPokemonDetails = async () => {
    try {
      setLoading(true);
      setTranslatedDescription(null);

      const detailsResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const detailsData = await detailsResponse.json();

      const speciesResponse = await fetch(detailsData.species.url);
      const speciesData = await speciesResponse.json();

      const flavorEntries = speciesData.flavor_text_entries || [];
      const entryTarget = flavorEntries.find((e: any) => e.language?.name === targetLang);
      const entryEn = flavorEntries.find((e: any) => e.language?.name === 'en');
      const entryAny = flavorEntries[0];

      let rawDesc = entryTarget?.flavor_text || entryEn?.flavor_text || entryAny?.flavor_text || 'Sin descripción disponible';
      rawDesc = cleanFlavor(rawDesc);

      let finalDescription = rawDesc;
      let maybeTranslated: string | null = null;

      if (!entryTarget && targetLang !== 'en') {
        maybeTranslated = await translateWithGemini(rawDesc, targetLang);
      }

      finalDescription = maybeTranslated || rawDesc;
      setTranslatedDescription(maybeTranslated || null);

      const evolutionChain = await parseEvolutionChain(speciesData.evolution_chain.url);
      const varieties = await fetchVarieties(speciesData.id, detailsData.id);

      const stats = detailsData.stats.map((stat: any) => ({
        name: stat.stat.name,
        baseStat: stat.base_stat
      }));

      const artworkDefault = detailsData.sprites?.other?.['official-artwork']?.front_default || null;
      const artworkShiny = detailsData.sprites?.other?.['official-artwork']?.front_shiny || null;
      const spriteDefault = detailsData.sprites?.front_default || null;
      const spriteShiny = detailsData.sprites?.front_shiny || null;
      const animatedRoot = detailsData.sprites?.versions?.['generation-v']?.['black-white']?.animated;
      const animatedDefault = animatedRoot?.front_default || null;
      const animatedShiny = animatedRoot?.front_shiny || null;

      setPokemon({
        id: detailsData.id,
        name: detailsData.name,
        types: detailsData.types.map((t: any) => t.type.name),
        height: detailsData.height / 10,
        weight: detailsData.weight / 10,
        description: finalDescription,
        stats,
        cry: detailsData.cries?.latest || detailsData.cries?.legacy || '',
        evolutionChain,
        varieties,
        artworkDefault,
        artworkShiny,
        spriteDefault,
        spriteShiny,
        animatedDefault,
        animatedShiny,
        speciesId: speciesData.id
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching pokemon details:', error);
      setLoading(false);
    }
  };

  const parseEvolutionChain = async (chainUrl: string): Promise<EvolutionChain[]> => {
    try {
      const response = await fetch(chainUrl);
      const data = await response.json();
      const evolutions: EvolutionChain[] = [];

      const processChain = async (node: any) => {
        try {
          const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${node.species.name}`);
          const pokemonData = await pokemonResponse.json();

          if (pokemonData.id <= 1025) {
            evolutions.push({
              id: pokemonData.id,
              name: node.species.name,
              sprite: pokemonData.sprites.other['official-artwork'].front_default,
              types: pokemonData.types.map((t: any) => t.type.name),
              method: node.evolution_details[0]?.trigger.name || 'level-up'
            });
          }

          for (const evolve of node.evolves_to) {
            await processChain(evolve);
          }
        } catch (error) {
          console.error('Error processing evolution:', error);
        }
      };

      await processChain(data.chain);
      return evolutions;
    } catch (error) {
      console.error('Error parsing evolution chain:', error);
      return [];
    }
  };

  const fetchVarieties = async (speciesId: number, pokemonId: number): Promise<Variety[]> => {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${speciesId}`);
      const data = await response.json();

      const varieties: Variety[] = [];

      for (const variety of data.varieties || []) {
        try {
          const varietyResponse = await fetch(variety.pokemon.url);
          const varietyData = await varietyResponse.json();

          if (varietyData.id !== pokemonId) {
            varieties.push({
              name: variety.pokemon.name,
              sprite: varietyData.sprites.other['official-artwork'].front_default,
              types: varietyData.types.map((t: any) => t.type.name),
              id: varietyData.id,
              speciesId: speciesId
            });
          }
        } catch (error) {
          console.error('Error fetching variety:', error);
        }
      }
      return varieties;
    } catch (error) {
      console.error('Error fetching varieties:', error);
      return [];
    }
  };

  const playPokemonCry = async () => {
    if (!pokemon?.cry) {
      alert('Sonido no disponible para este Pokémon');
      return;
    }
    try {
      setPlayingSound(true);
      const { sound } = await Audio.Sound.createAsync({ uri: pokemon.cry });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('isLoaded' in status && status.isLoaded && 'didJustFinish' in status && status.didJustFinish) {
          setPlayingSound(false);
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
      setPlayingSound(false);
    }
  };

  const getTypeColor = (type: string): string => {
    const typeColors: { [key: string]: string } = {
      grass: 'bg-green-500',
      poison: 'bg-purple-500',
      fire: 'bg-orange-500',
      water: 'bg-blue-500',
      normal: 'bg-gray-400',
      flying: 'bg-indigo-400',
      bug: 'bg-lime-500',
      electric: 'bg-yellow-400',
      ground: 'bg-amber-600',
      rock: 'bg-stone-500',
      ice: 'bg-cyan-400',
      fighting: 'bg-red-600',
      psychic: 'bg-pink-500',
      dragon: 'bg-indigo-600',
      dark: 'bg-gray-700',
      steel: 'bg-slate-400',
      fairy: 'bg-pink-400'
    };
    return typeColors[type] || 'bg-gray-400';
  };

  const getCardColor = (types: string[]): string => {
    const mainType = types[0];
    const cardColors: { [key: string]: string } = {
      grass: 'bg-teal-300',
      poison: 'bg-teal-300',
      fire: 'bg-orange-200',
      water: 'bg-cyan-200',
      normal: 'bg-stone-200',
      flying: 'bg-sky-200',
      bug: 'bg-lime-200',
      electric: 'bg-yellow-200',
      ground: 'bg-amber-300',
      rock: 'bg-stone-300',
      ice: 'bg-cyan-100',
      fighting: 'bg-red-300',
      psychic: 'bg-pink-200',
      dragon: 'bg-indigo-300',
      dark: 'bg-gray-500',
      steel: 'bg-slate-200',
      fairy: 'bg-pink-100'
    };
    return cardColors[mainType] || 'bg-stone-200';
  };

  const currentImage = useMemo(() => {
    if (!pokemon) return null;

    const {
      artworkDefault, artworkShiny,
      spriteDefault, spriteShiny,
      animatedDefault, animatedShiny
    } = pokemon;

    if (viewMode === 'artwork') {
      return isShiny
        ? (artworkShiny || artworkDefault || spriteShiny || spriteDefault)
        : (artworkDefault || spriteDefault || artworkShiny || spriteShiny);
    }

    if (viewMode === 'sprite') {
      return isShiny
        ? (spriteShiny || spriteDefault || artworkShiny || artworkDefault)
        : (spriteDefault || artworkDefault || spriteShiny || artworkShiny);
    }

    if (isShiny) {
      return animatedShiny || spriteShiny || animatedDefault || spriteDefault || artworkShiny || artworkDefault;
    } else {
      return animatedDefault || spriteDefault || artworkDefault || spriteShiny || artworkShiny;
    }
  }, [pokemon, viewMode, isShiny]);

  const cyclePrevMode = () => {
    const order: ViewMode[] = ['artwork', 'sprite', 'animated'];
    const idx = order.indexOf(viewMode);
    const prev = idx === 0 ? order[order.length - 1] : order[idx - 1];
    setViewMode(prev);
  };

  const cycleNextMode = () => {
    const order: ViewMode[] = ['artwork', 'sprite', 'animated'];
    const idx = order.indexOf(viewMode);
    const next = idx === order.length - 1 ? order[0] : order[idx + 1];
    setViewMode(next);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-red-500 justify-center items-center">
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (!pokemon) {
    return (
      <View className="flex-1 bg-red-500 justify-center items-center">
        <Text className="text-white text-lg">Pokémon no encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-red-500">
      {/* Header con botón atrás */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-extrabold">Detalles</Text>
        <View className="w-7" />
      </View>

      {/* Card principal del Pokémon */}
      <View className={`mx-4 rounded-xl ${getCardColor(pokemon.types)} p-4 mb-4`}>
        <View className="items-center">
          {/* Número y Nombre */}
          <Text className="text-gray-600 text-3xl font-extrabold">
            #{pokemon.speciesId.toString().padStart(3, '0')}
          </Text>
          <Text className="text-gray-900 text-2xl font-extrabold capitalize mt-1">
            {pokemon.name}
          </Text>

          {/* Controles de estilo + imagen */}
          <View className="flex-row items-center mt-2">
            {/* Flecha izquierda */}
            <TouchableOpacity onPress={cyclePrevMode} className="p-2">
              <Ionicons name="chevron-back-circle" size={30} color="#374151" />
            </TouchableOpacity>

            {/* Imagen con toggle shiny */}
            <TouchableOpacity onPress={() => setIsShiny(s => !s)} className="mx-2">
              <View className="bg-white/50 rounded-full p-3">
                {currentImage ? (
                  <Image
                    source={{ uri: currentImage }}
                    className="w-32 h-32"
                    resizeMode="contain"
                  />
                ) : (
                  <View className="w-32 h-32 items-center justify-center">
                    <Text className="text-gray-600 text-xs">Sin imagen</Text>
                  </View>
                )}
              </View>
              <Text className="text-xs text-gray-700 mt-1 text-center font-semibold">
                {isShiny ? 'Shiny (toca para normal)' : 'Normal (toca para shiny)'}
              </Text>
            </TouchableOpacity>

            {/* Flecha derecha */}
            <TouchableOpacity onPress={cycleNextMode} className="p-2">
              <Ionicons name="chevron-forward-circle" size={30} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Tipos */}
          <View className="flex-row gap-2 mt-3">
            {pokemon.types.map((type, index) => (
              <View key={index} className={`${getTypeColor(type)} px-4 py-1.5 rounded-full`}>
                <Text className="text-white text-xs font-extrabold uppercase">
                  {type}
                </Text>
              </View>
            ))}
          </View>

          {/* Información básica */}
          <View className="flex-row gap-4 mt-4 w-full">
            <View className="flex-1 items-center">
              <Text className="text-gray-700 text-sm font-bold">Altura</Text>
              <Text className="text-gray-900 text-lg font-extrabold">
                {pokemon.height} m
              </Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-gray-700 text-sm font-bold">Peso</Text>
              <Text className="text-gray-900 text-lg font-extrabold">
                {pokemon.weight} kg
              </Text>
            </View>
          </View>

          {/* Botón para reproducir sonido */}
          {pokemon.cry && (
            <TouchableOpacity
              onPress={playPokemonCry}
              disabled={playingSound}
              className="mt-4 bg-white/70 px-6 py-2 rounded-full flex-row items-center gap-2"
            >
              <Ionicons name={playingSound ? 'volume-mute' : 'volume-high'} size={20} color="#333" />
              <Text className="text-gray-900 font-bold text-sm">
                {playingSound ? 'Reproduciendo...' : 'Reproducir Sonido'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Descripción */}
      <View className="mx-4 mb-4">
        <Text className="text-white text-lg font-extrabold mb-2">Descripción</Text>
        <View className="bg-white rounded-lg p-3">
          <Text className="text-gray-800 text-sm leading-5">
            {translatedDescription ?? pokemon.description}
          </Text>
        </View>
      </View>

      {/* Estadísticas */}
      <PokemonStats stats={pokemon.stats} mainType={pokemon.types[0]} />

      {/* Cadena Evolutiva */}
      {pokemon.evolutionChain.length > 1 && (
        <View className="mx-4 mb-4">
          <Text className="text-white text-lg font-extrabold mb-3">Cadena Evolutiva</Text>
          <View className="bg-white rounded-lg p-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row items-center gap-1">
                {pokemon.evolutionChain.map((evolution, index) => (
                  <View key={index} className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => router.push(`/pokemon/${evolution.id}`)}
                      className={`${getCardColor(evolution.types)} rounded-lg p-2 items-center w-24`}
                    >
                      <Text className="text-gray-700 text-xs font-bold">
                        #{evolution.id.toString().padStart(3, '0')}
                      </Text>
                      <Image
                        source={{ uri: evolution.sprite }}
                        className="w-16 h-16"
                        resizeMode="contain"
                      />
                      <Text className="text-gray-900 text-xs font-bold capitalize text-center">
                        {evolution.name}
                      </Text>
                      <View className="flex-row gap-0.5 mt-1 justify-center flex-wrap">
                        {evolution.types.map((type, idx) => (
                          <View key={idx} className={`${getTypeColor(type)} px-1.5 py-0.5 rounded-full`}>
                            <Text className="text-white text-xs font-bold uppercase">
                              {type.slice(0, 2)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </TouchableOpacity>
                    {index < pokemon.evolutionChain.length - 1 && (
                      <Text className="mx-1 text-gray-900 text-lg font-bold">→</Text>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Formas Alternativas */}
      {pokemon.varieties.length > 0 && (
        <View className="mx-4 mb-6">
          <Text className="text-white text-lg font-extrabold mb-3">Formas Alternativas</Text>
          <View className="bg-white rounded-lg p-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {pokemon.varieties.map((variety, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => router.push(`/pokemon/${variety.id}`)}
                    className={`${getCardColor(variety.types)} rounded-lg p-2 items-center w-24`}
                  >
                    <Text className="text-gray-700 text-xs font-bold">
                      #{variety.speciesId.toString().padStart(3, '0')}
                    </Text>
                    <Text className="text-gray-600 text-xs font-semibold capitalize text-center mb-1">
                      {variety.name.replace(/-/g, ' ').replace(/^.*\s/, '')}
                    </Text>
                    <Image
                      source={{ uri: variety.sprite }}
                      className="w-16 h-16"
                      resizeMode="contain"
                    />
                    <View className="flex-row gap-0.5 mt-1 justify-center flex-wrap">
                      {variety.types.map((type, idx) => (
                        <View key={idx} className={`${getTypeColor(type)} px-1.5 py-0.5 rounded-full`}>
                          <Text className="text-white text-xs font-bold uppercase">
                            {type.slice(0, 2)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
