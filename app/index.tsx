import { View, Text, FlatList, Image, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import GenerationModal from '../components/ui/GenerationModal';
import TypeModal from '../components/ui/TypeModal';

interface Pokemon {
  id: number;
  name: string;
  types: string[];
  sprite: string;
  generation: number;
}

export default function Index() {
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [filteredPokemons, setFilteredPokemons] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGeneration, setSelectedGeneration] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [generationModalVisible, setGenerationModalVisible] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchPokemons();
  }, []);

  useEffect(() => {
    filterPokemons();
  }, [searchQuery, selectedGeneration, selectedType, pokemons]);

  const fetchPokemons = async () => {
    try {
      const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
      const data = await response.json();
      
      const pokemonDetails = await Promise.all(
        data.results.map(async (pokemon: any) => {
          try {
            const details = await fetch(pokemon.url);
            const detailsData = await details.json();

            if (detailsData.id >= 1 && detailsData.id <= 1025) {
              const generation = Math.ceil(detailsData.id / 151);

              return {
                id: detailsData.id,
                name: detailsData.name,
                types: detailsData.types.map((t: any) => t.type.name),
                sprite: detailsData.sprites.other['official-artwork'].front_default,
                generation: generation
              };
            }
            return null;
          } catch (error) {
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

    // Filtro por búsqueda
    if (searchQuery !== '') {
      result = result.filter(pokemon =>
        pokemon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pokemon.id.toString().includes(searchQuery)
      );
    }

    // Filtro por generación
    if (selectedGeneration !== null) {
      result = result.filter(pokemon => pokemon.generation === selectedGeneration);
    }

    // Filtro por tipo
    if (selectedType !== null) {
      result = result.filter(pokemon => pokemon.types.includes(selectedType));
    }

    setFilteredPokemons(result);
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

  const renderPokemonCard = ({ item }: { item: Pokemon }) => (
    <TouchableOpacity onPress={() => router.push(`/pokemon/${item.id}`)}>
      <View className={`mx-3 my-1.5 rounded-xl ${getCardColor(item.types)} shadow-sm`}>
        <View className="flex-row items-center px-3 py-2">
          <View>
            <Text className="text-gray-600 text-2xl font-extrabold" style={{ letterSpacing: 0.5 }}>
              #{item.id.toString().padStart(3, '0')}
            </Text>
            <Text className="text-gray-900 text-xl font-extrabold capitalize mt-0.5" style={{ letterSpacing: 0.3 }}>
              {item.name}
            </Text>
          </View>

          <View className="flex-1 flex-row items-center justify-end gap-2">
            <View className="gap-1.5">
              {item.types.map((type, index) => (
                <View
                  key={index}
                  className={`${getTypeColor(type)} px-4 py-1.5 rounded-full`}
                >
                  <Text className="text-white text-sm font-extrabold uppercase">
                    {type}
                  </Text>
                </View>
              ))}
            </View>

            <View className="bg-white/50 rounded-full p-1.5">
              <Image
                source={{ uri: item.sprite }}
                className="w-24 h-24"
                resizeMode="contain"
              />
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
      <View className="pt-10 pb-3 items-center">
        <Image
          source={require('../assets/images/icon.png')}
          className="w-56 h-16"
          resizeMode="contain"
        />
      </View>

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
          className={`flex-1 py-2 rounded-full ${
            selectedGeneration ? 'bg-white' : 'bg-red-600'
          }`}
        >
          <Text
            className={`text-center font-bold text-sm ${
              selectedGeneration ? 'text-red-500' : 'text-white'
            }`}
          >
            {selectedGeneration ? `Gen ${selectedGeneration}` : 'GENERACIONES'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTypeModalVisible(true)}
          className={`flex-1 py-2 rounded-full ${
            selectedType ? 'bg-white' : 'bg-red-600'
          }`}
        >
          <Text
            className={`text-center font-bold text-sm ${
              selectedType ? 'text-red-500' : 'text-white'
            }`}
          >
            {selectedType ? selectedType.toUpperCase() : 'TIPOS'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mostrar filtros activos */}
      {(selectedGeneration || selectedType || searchQuery) && (
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
        </View>
      )}

      <FlatList
        data={filteredPokemons}
        renderItem={renderPokemonCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 20 }}
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
    </View>
  );
}