import { View, Text, FlatList, Image, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import GenerationModal from '../components/ui/GenerationModal';
import TypeModal from '../components/ui/TypeModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

interface Pokemon {
  id: number;
  name: string;
  types: string[];
  sprite: string | null;
  generation: number;
}

type ViewStyleMode = 'artwork' | 'artwork-shiny' | 'sprite' | 'sprite-shiny' | 'sprite-animated';

export default function Index() {
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [filteredPokemons, setFilteredPokemons] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGeneration, setSelectedGeneration] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [generationModalVisible, setGenerationModalVisible] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);

  // Favoritos / Capturados / Filtros visibles
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [captured, setCaptured] = useState<Set<number>>(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showOnlyCaptured, setShowOnlyCaptured] = useState(false);

  // Estilo de visualización en la lista (cambia qué sprite cargamos al fetch)
  const [viewStyle, setViewStyle] = useState<ViewStyleMode>('artwork');

  // FAB “+”
  const [fabOpen, setFabOpen] = useState(false);

  const router = useRouter();

  // ---------- INTEGRACIÓN GOOGLE GENAI ----------
  const geminiApiKey = "AIzaSyCuIoY6RqdNcEpb4P3i1fI5uu-y9iXHAgU"; 

  // Instancia para Gemini
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const consultaGemini = async (texto: string) => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: texto,
      });
      return response.text;
    } catch (error) {
      return "Error consultando IA";
    }
  };
  // Ejemplo de uso: llama consultaGemini("¿Cómo capturar un Mewtwo?") y muestra el resultado donde lo necesites

  // -----------------------------------------------

  // Cargar favoritos/capturados
  useEffect(() => {
    (async () => {
      try {
        const favRaw = await AsyncStorage.getItem('favorites');
        const capRaw = await AsyncStorage.getItem('captured');
        if (favRaw) setFavorites(new Set(JSON.parse(favRaw)));
        if (capRaw) setCaptured(new Set(JSON.parse(capRaw)));
      } catch {}
    })();
  }, []);

  const persistSets = async (key: 'favorites' | 'captured', setObj: Set<number>) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(Array.from(setObj)));
    } catch {}
  };

  const toggleFavorite = (id: number) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      persistSets('favorites', next);
      return next;
    });
  };

  const toggleCaptured = (id: number) => {
    setCaptured(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      persistSets('captured', next);
      return next;
    });
  };

  useEffect(() => {
    fetchPokemons();
  }, []);

  useEffect(() => {
    filterPokemons();
  }, [searchQuery, selectedGeneration, selectedType, pokemons, showOnlyFavorites, showOnlyCaptured, favorites, captured]);

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

  const pickImageByMode = (detailsData: any): string | null => {
    switch (viewStyle) {
      case 'artwork':
        return detailsData.sprites?.other?.['official-artwork']?.front_default
          || detailsData.sprites?.front_default
          || null;
      case 'artwork-shiny':
        return detailsData.sprites?.other?.['official-artwork']?.front_shiny
          || detailsData.sprites?.front_shiny
          || detailsData.sprites?.other?.['official-artwork']?.front_default
          || detailsData.sprites?.front_default
          || null;
      case 'sprite':
        return detailsData.sprites?.front_default
          || detailsData.sprites?.other?.['official-artwork']?.front_default
          || null;
      case 'sprite-shiny':
        return detailsData.sprites?.front_shiny
          || detailsData.sprites?.front_default
          || detailsData.sprites?.other?.['official-artwork']?.front_shiny
          || detailsData.sprites?.other?.['official-artwork']?.front_default
          || null;
      case 'sprite-animated':
        return detailsData.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default
          || detailsData.sprites?.front_default
          || detailsData.sprites?.other?.['official-artwork']?.front_default
          || null;
      default:
        return detailsData.sprites?.other?.['official-artwork']?.front_default || null;
    }
  };

  const fetchPokemons = async () => {
    try {
      const response = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=1025');
      const data = response.data;

      const pokemonDetails = await Promise.all(
        data.results.map(async (pokemon: any) => {
          try {
            const detailsResponse = await axios.get(pokemon.url);
            const detailsData = detailsResponse.data;

            if (detailsData.id >= 1 && detailsData.id <= 1025) {
              const generation = Math.ceil(detailsData.id / 151);
              const spriteUrl = pickImageByMode(detailsData);
              return {
                id: detailsData.id,
                name: detailsData.name,
                types: detailsData.types.map((t: any) => t.type.name),
                sprite: spriteUrl,
                generation: generation,
              };
            }
            return null;
          } catch {
            return null;
          }
        })
      );

      const filtered = pokemonDetails.filter((p): p is Pokemon => p !== null);
      setPokemons(filtered);
      setFilteredPokemons(filtered);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pokemons:', error);
      setLoading(false);
    }
  };

  const filterPokemons = () => {
    let result = pokemons;

    if (searchQuery !== '') {
      result = result.filter(pokemon =>
        pokemon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pokemon.id.toString().includes(searchQuery)
      );
    }

    if (selectedGeneration !== null) {
      result = result.filter(pokemon => pokemon.generation === selectedGeneration);
    }

    if (selectedType !== null) {
      result = result.filter(pokemon => pokemon.types.includes(selectedType));
    }

    if (showOnlyFavorites) {
      result = result.filter(p => favorites.has(p.id));
    }

    if (showOnlyCaptured) {
      result = result.filter(p => captured.has(p.id));
    }

    setFilteredPokemons(result);
  };

  const renderPokemonCard = ({ item }: { item: Pokemon }) => (
    <TouchableOpacity onPress={() => router.push(`/pokemon/${item.id}`)}>
      <View className={`mx-3 my-1.5 rounded-xl ${getCardColor(item.types)} shadow-sm`}>
        <View className="flex-row items-center px-3 py-2">
          <View className="flex-1">
            <Text className="text-gray-600 text-2xl font-extrabold" style={{ letterSpacing: 0.5 }}>
              #{item.id.toString().padStart(3, '0')}
            </Text>
            <Text className="text-gray-900 text-xl font-extrabold capitalize mt-0.5" style={{ letterSpacing: 0.3 }}>
              {item.name}
            </Text>

            {/* Toggles favorito / capturado */}
            <View className="flex-row items-center gap-2 mt-2">
              <TouchableOpacity onPress={() => toggleFavorite(item.id)} className="mr-1">
                <Ionicons
                  name={favorites.has(item.id) ? 'heart' : 'heart-outline'}
                  size={20}
                  color={favorites.has(item.id) ? '#ef4444' : '#6b7280'}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleCaptured(item.id)}>
                <MaterialCommunityIcons
                  name="pokeball"
                  size={20}
                  color={captured.has(item.id) ? '#16a34a' : '#6b7280'}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row items-center justify-end gap-2">
            <View className="gap-1.5">
              {item.types.map((type, index) => (
                <View key={index} className={`${getTypeColor(type)} px-4 py-1.5 rounded-full`}>
                  <Text className="text-white text-sm font-extrabold uppercase">
                    {type}
                  </Text>
                </View>
              ))}
            </View>

            <View className="bg-white/50 rounded-full p-1.5 ml-2">
              {item.sprite ? (
                <Image
                  source={{ uri: item.sprite }}
                  className="w-24 h-24"
                  resizeMode="contain"
                />
              ) : (
                <View className="w-24 h-24 items-center justify-center">
                  <Text className="text-gray-600 text-xs">Sin imagen</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-red-500 justify-center items-center">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-white mt-4 text-lg font-semibold">
          Cargando Pokédex...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-red-500">
      {/* Header */}
      <View className="pt-10 pb-3 items-center">
        <Image
          source={require('../assets/images/icon.png')}
          className="w-56 h-16"
          resizeMode="contain"
        />
      </View>

      {/* Buscador */}
      <View className="px-4 pb-3">
        <TextInput
          className="bg-white rounded-full px-5 py-2 text-base text-gray-800 font-medium"
          placeholder="Buscar Pokémon..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Menú de filtros */}
      <View className="flex-row px-4 pb-3 gap-3">
        <TouchableOpacity
          onPress={() => setGenerationModalVisible(true)}
          className={`flex-1 py-2 rounded-full ${selectedGeneration ? 'bg-white' : 'bg-red-600'}`}
        >
          <Text
            className={`text-center font-bold text-sm ${selectedGeneration ? 'text-red-500' : 'text-white'}`}
          >
            {selectedGeneration ? `Gen ${selectedGeneration}` : 'GENERACIONES'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTypeModalVisible(true)}
          className={`flex-1 py-2 rounded-full ${selectedType ? 'bg-white' : 'bg-red-600'}`}
        >
          <Text
            className={`text-center font-bold text-sm ${selectedType ? 'text-red-500' : 'text-white'}`}
          >
            {selectedType ? selectedType.toUpperCase() : 'TIPOS'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mostrar filtros activos */}
      {(selectedGeneration || selectedType || searchQuery || showOnlyFavorites || showOnlyCaptured) && (
        <View className="px-4 pb-2 flex-row flex-wrap gap-2">
          {selectedGeneration && (
            <TouchableOpacity
              onPress={() => setSelectedGeneration(null)}
              className="bg-white/20 rounded-full px-3 py-1 flex-row items-center gap-1"
            >
              <Text className="text-white text-xs font-bold">Gen {selectedGeneration}</Text>
              <Text className="text-white text-lg">×</Text>
            </TouchableOpacity>
          )}
          {selectedType && (
            <TouchableOpacity
              onPress={() => setSelectedType(null)}
              className="bg-white/20 rounded-full px-3 py-1 flex-row items-center gap-1"
            >
              <Text className="text-white text-xs font-bold capitalize">{selectedType}</Text>
              <Text className="text-white text-lg">×</Text>
            </TouchableOpacity>
          )}
          {showOnlyFavorites && (
            <TouchableOpacity
              onPress={() => setShowOnlyFavorites(false)}
              className="bg-white/20 rounded-full px-3 py-1 flex-row items-center gap-1"
            >
              <Ionicons name="heart" size={14} color="#fff" />
              <Text className="text-white text-xs font-bold">Favoritos</Text>
              <Text className="text-white text-lg">×</Text>
            </TouchableOpacity>
          )}
          {showOnlyCaptured && (
            <TouchableOpacity
              onPress={() => setShowOnlyCaptured(false)}
              className="bg-white/20 rounded-full px-3 py-1 flex-row items-center gap-1"
            >
              <MaterialCommunityIcons name="pokeball" size={14} color="#fff" />
              <Text className="text-white text-xs font-bold">Capturados</Text>
              <Text className="text-white text-lg">×</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Lista */}
      <FlatList
        data={filteredPokemons}
        renderItem={renderPokemonCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Modales */}
      <GenerationModal
        visible={generationModalVisible}
        onClose={() => setGenerationModalVisible(false)}
        onSelect={setSelectedGeneration}
        selectedGeneration={selectedGeneration}
      />
      <TypeModal
        visible={typeModalVisible}
        onClose={() => setTypeModalVisible(false)}
        onSelect={setSelectedType}
        selectedType={selectedType}
      />

      {/* FAB: “+” → IA / Favoritos / Capturados */}
      <View className="absolute bottom-6 right-6 items-end">
        {fabOpen && (
          <View className="mb-3 items-end">
            {/* Capturados */}
            <TouchableOpacity
              onPress={() => { setShowOnlyCaptured(v => !v); if (showOnlyFavorites) setShowOnlyFavorites(false); }}
              className={`rounded-full px-4 py-2 mb-2 flex-row items-center shadow ${showOnlyCaptured ? 'bg-green-500' : 'bg-white'}`}
            >
              <MaterialCommunityIcons name="pokeball" size={16} color={showOnlyCaptured ? '#fff' : '#111827'} />
              <Text className={`ml-2 font-bold ${showOnlyCaptured ? 'text-white' : 'text-gray-900'}`}>Capturados</Text>
            </TouchableOpacity>

            {/* Favoritos */}
            <TouchableOpacity
              onPress={() => { setShowOnlyFavorites(v => !v); if (showOnlyCaptured) setShowOnlyCaptured(false); }}
              className={`rounded-full px-4 py-2 mb-2 flex-row items-center shadow ${showOnlyFavorites ? 'bg-red-500' : 'bg-white'}`}
            >
              <Ionicons name="heart" size={16} color={showOnlyFavorites ? '#fff' : '#111827'} />
              <Text className={`ml-2 font-bold ${showOnlyFavorites ? 'text-white' : 'text-gray-900'}`}>Favoritos</Text>
            </TouchableOpacity>

            {/* IA */}
            <TouchableOpacity
              onPress={() => router.push('/chatbot')}
              className="bg-white rounded-full px-4 py-2 mb-2 flex-row items-center shadow"
            >
              <Ionicons name="sparkles-outline" size={16} color="#111827" />
              <Text className="ml-2 text-gray-900 font-bold">IA</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botón principal “+” */}
        <TouchableOpacity onPress={() => setFabOpen(!fabOpen)} className="bg-white rounded-full p-4 shadow-lg">
          <Ionicons name={fabOpen ? 'close' : 'add'} size={28} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}