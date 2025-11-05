import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import PokemonStats from '../../components/ui/PokemonStats';


interface Pokemon {
  id: number;
  name: string;
  types: string[];
  sprite: string;
  shinySprite: string;
  height: number;
  weight: number;
  description: string;
  stats: { name: string; baseStat: number }[];
  cry: string;
  evolutionChain: EvolutionChain[];
  varieties: Variety[];
  speciesId: number; // ID de la especie base
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
  speciesId: number; // ID de la especie base para mostrar
}


export default function PokemonDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShiny, setShowShiny] = useState(false);
  const [playingSound, setPlayingSound] = useState(false);


  useEffect(() => {
    fetchPokemonDetails();
  }, [id]);


  const fetchPokemonDetails = async () => {
    try {
      setLoading(true);
      const detailsResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const detailsData = await detailsResponse.json();


      const speciesResponse = await fetch(detailsData.species.url);
      const speciesData = await speciesResponse.json();


      const description = speciesData.flavor_text_entries
        .find((entry: any) => entry.language.name === 'es')?.flavor_text
        .replace(/\f/g, ' ') || speciesData.flavor_text_entries[0]?.flavor_text || 'Sin descripción disponible';


      const evolutionChain = await parseEvolutionChain(speciesData.evolution_chain.url, speciesData.id);
      const varieties = await fetchVarieties(speciesData.id, detailsData.id);


      const stats = detailsData.stats.map((stat: any) => ({
        name: stat.stat.name,
        baseStat: stat.base_stat
      }));


      setPokemon({
        id: detailsData.id,
        name: detailsData.name,
        types: detailsData.types.map((t: any) => t.type.name),
        sprite: detailsData.sprites.other['official-artwork'].front_default,
        shinySprite: detailsData.sprites.other['official-artwork'].front_shiny,
        height: detailsData.height / 10,
        weight: detailsData.weight / 10,
        description: description,
        stats: stats,
        cry: detailsData.cries?.latest || detailsData.cries?.legacy || '',
        evolutionChain: evolutionChain,
        varieties: varieties,
        speciesId: speciesData.id // Guardar el ID de la especie
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pokemon details:', error);
      setLoading(false);
    }
  };


  const parseEvolutionChain = async (chainUrl: string, speciesId: number): Promise<EvolutionChain[]> => {
    try {
      const response = await fetch(chainUrl);
      const data = await response.json();
      const evolutions: EvolutionChain[] = [];


      const processChain = async (node: any) => {
        try {
          const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${node.species.name}`);
          const pokemonData = await pokemonResponse.json();


          // Solo agregar si es la forma base (id <= 1025)
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


          // Incluir todas las formas alternativas (incluso con IDs altos)
          if (varietyData.id !== pokemonId) {
            varieties.push({
              name: variety.pokemon.name,
              sprite: varietyData.sprites.other['official-artwork'].front_default,
              types: varietyData.types.map((t: any) => t.type.name),
              id: varietyData.id, // ID real del Pokémon para navegación
              speciesId: speciesId // ID de la especie base para mostrar
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


  if (loading) {
    return (
      <View className="flex-1 bg-red-500 justify-center items-center">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-white mt-4 text-lg font-semibold">
          Cargando detalles...
        </Text>
      </View>
    );
  }


  if (!pokemon) {
    return (
      <View className="flex-1 bg-red-500 justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="white" />
        <Text className="text-white text-xl font-bold mt-4 text-center">
          Pokémon no encontrado
        </Text>
        <Text className="text-white/80 text-sm mt-2 text-center">
          No se pudo cargar la información. Verifica tu conexión a internet.
        </Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-6 bg-white px-6 py-3 rounded-full"
        >
          <Text className="text-red-500 font-bold">Volver</Text>
        </TouchableOpacity>
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
          {/* Número y Nombre - CORREGIDO: Usar speciesId */}
          <Text className="text-gray-600 text-3xl font-extrabold">
            #{pokemon.speciesId.toString().padStart(3, '0')}
          </Text>
          <Text className="text-gray-900 text-2xl font-extrabold capitalize mt-1">
            {pokemon.name}
          </Text>


          {/* Imagen del Pokémon */}
          <TouchableOpacity onPress={() => setShowShiny(!showShiny)} className="mt-2">
            <View className="bg-white/50 rounded-full p-3">
              <Image
                source={{ uri: showShiny ? pokemon.shinySprite : pokemon.sprite }}
                className="w-32 h-32"
                resizeMode="contain"
              />
            </View>
            <Text className="text-xs text-gray-700 mt-1 text-center font-semibold">
              {showShiny ? 'Toca para ver normal' : 'Toca para ver shiny'}
            </Text>
          </TouchableOpacity>


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
            {pokemon.description}
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


      {/* Formas Alternativas (incluye Mega y otras) - CORREGIDO */}
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
                    {/* CORREGIDO: Mostrar speciesId en lugar de variety.id */}
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