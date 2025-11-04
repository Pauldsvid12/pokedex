import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Animated, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';

interface PokemonDetail {
  id: number;
  name: string;
  types: string[];
  sprite: string;
  shinySprite: string;
  height: number;
  weight: number;
  description: string;
  cry: string;
  stats: { name: string; value: number }[];
  evolutionChain: EvolutionMember[];
  varieties: Variety[];
  megaEvolutions: MegaEvolution[];
}

interface EvolutionMember {
  id: number;
  name: string;
  sprite: string;
  types: string[];
}

interface Variety {
  name: string;
  sprite: string;
  types: string[];
}

interface MegaEvolution {
  name: string;
  sprite: string;
  types: string[];
}

const typeColors: { [key: string]: string } = {
  grass: '#78C850',
  poison: '#A040A0',
  fire: '#F08030',
  water: '#6890F0',
  normal: '#A8A878',
  flying: '#A890F0',
  bug: '#A8B820',
  electric: '#F8D030',
  ground: '#E0C068',
  rock: '#B8A038',
  ice: '#98D8D8',
  fighting: '#C03028',
  psychic: '#F85888',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
};

export default function PokemonDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [pokemon, setPokemon] = useState<PokemonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShiny, setShowShiny] = useState(false);

  useEffect(() => {
    fetchPokemonDetail();
  }, [id]);

  const fetchPokemonDetail = async () => {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const data = await response.json();

      const speciesResponse = await fetch(data.species.url);
      const speciesData = await speciesResponse.json();

      const description = speciesData.flavor_text_entries
        ?.find((entry: any) => entry.language.name === 'es')?.flavor_text ||
        speciesData.flavor_text_entries?.[0]?.flavor_text ||
        'Sin descripción disponible';

      const evolutionResponse = await fetch(speciesData.evolution_chain.url);
      const evolutionData = await evolutionResponse.json();

      const varietiesData = speciesData.varieties || [];
      const varieties: Variety[] = await Promise.all(
        varietiesData.map(async (variety: any) => {
          const varDetail = await fetch(variety.pokemon.url);
          const varData = await varDetail.json();
          return {
            name: varData.name,
            sprite: varData.sprites.other['official-artwork'].front_default,
            types: varData.types.map((t: any) => t.type.name),
          };
        })
      );

      const megaEvolutions = await getMegaEvolutions(data.name);

      setPokemon({
        id: data.id,
        name: data.name,
        types: data.types.map((t: any) => t.type.name),
        sprite: data.sprites.other['official-artwork'].front_default,
        shinySprite: data.sprites.other['official-artwork'].front_shiny,
        height: data.height / 10,
        weight: data.weight / 10,
        description: description.replace(/\f/g, ' '),
        cry: data.cries?.latest || '',
        stats: data.stats.map((stat: any) => ({
          name: stat.stat.name,
          value: stat.base_stat,
        })),
        evolutionChain: await parseEvolutionChain(evolutionData.chain),
        varieties,
        megaEvolutions,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching pokemon detail:', error);
      setLoading(false);
    }
  };

  const getMegaEvolutions = async (pokemonName: string): Promise<MegaEvolution[]> => {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon-form?limit=10000`);
      const data = await response.json();

      const megaForms = data.results.filter((form: any) => 
        form.name.includes(`${pokemonName}-mega`) || 
        form.name.includes(`${pokemonName}-gigantamax`)
      );

      const megas: MegaEvolution[] = await Promise.all(
        megaForms.map(async (form: any) => {
          const formDetail = await fetch(form.url);
          const formData = await formDetail.json();
          return {
            name: formData.name,
            sprite: formData.sprites?.front_default || '',
            types: formData.types?.map((t: any) => t.type.name) || [],
          };
        })
      );

      return megas;
    } catch (error) {
      return [];
    }
  };

  const parseEvolutionChain = async (chain: any): Promise<EvolutionMember[]> => {
    const members: EvolutionMember[] = [];

    const processChain = async (node: any) => {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${node.species.name}`);
      const data = await response.json();

      members.push({
        id: data.id,
        name: data.name,
        sprite: data.sprites.other['official-artwork'].front_default,
        types: data.types.map((t: any) => t.type.name),
      });

      if (node.evolves_to.length > 0) {
        for (const evolution of node.evolves_to) {
          await processChain(evolution);
        }
      }
    };

    await processChain(chain);
    return members;
  };

  const getTypeColor = (type: string): string => {
    return typeColors[type] || '#A8A878';
  };

  const getCardBackgroundColor = (types: string[]): string => {
    const typeBackgrounds: { [key: string]: string } = {
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
      fairy: 'bg-pink-100',
    };
    return typeBackgrounds[types[0]] || 'bg-stone-200';
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
        <Text className="text-white text-lg font-semibold">Pokémon no encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-red-500">
      {/* Header con botón atrás */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-white text-2xl font-bold">← Atrás</Text>
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Detalles</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tarjeta principal */}
      <View className={`mx-4 my-3 rounded-2xl ${getCardBackgroundColor(pokemon.types)} p-4`}>
        <View className="items-center mb-4">
          <Text className="text-gray-600 text-2xl font-extrabold">
            #{pokemon.id.toString().padStart(3, '0')}
          </Text>
          <Text className="text-gray-900 text-3xl font-extrabold capitalize mt-2">
            {pokemon.name}
          </Text>
        </View>

        <View className="flex-row gap-2 justify-center mb-4">
          {pokemon.types.map((type, idx) => (
            <View
              key={idx}
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: getTypeColor(type) }}
            >
              <Text className="text-white text-sm font-extrabold uppercase">
                {type}
              </Text>
            </View>
          ))}
        </View>

        <View className="items-center mb-4">
          <TouchableOpacity onPress={() => setShowShiny(!showShiny)}>
            <Image
              source={{ uri: showShiny ? pokemon.shinySprite : pokemon.sprite }}
              className="w-32 h-32"
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text className="text-gray-600 text-xs font-bold mt-2">
            {showShiny ? 'Toca para normal' : 'Toca para shiny'}
          </Text>
        </View>

        {/* Información básica */}
        <View className="bg-white/30 rounded-xl p-3 mb-4">
          <Text className="text-gray-900 font-bold mb-2">Información</Text>
          <Text className="text-gray-800 text-sm mb-1">
            <Text className="font-bold">Altura:</Text> {pokemon.height}m
          </Text>
          <Text className="text-gray-800 text-sm mb-1">
            <Text className="font-bold">Peso:</Text> {pokemon.weight}kg
          </Text>
        </View>

        {/* Descripción */}
        <View className="bg-white/30 rounded-xl p-3 mb-4">
          <Text className="text-gray-900 font-bold mb-2">Descripción</Text>
          <Text className="text-gray-800 text-sm">{pokemon.description}</Text>
        </View>

        {/* Sonido */}
        {pokemon.cry && (
          <TouchableOpacity 
            onPress={() => Linking.openURL(pokemon.cry)}
            className="bg-white/30 rounded-xl p-3 mb-4 items-center"
          >
            <Text className="text-gray-900 font-bold">🔊 Reproducir sonido</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Estadísticas */}
      <View className="mx-4 my-3">
        <Text className="text-white text-lg font-bold mb-3">Estadísticas Base</Text>
        {pokemon.stats.map((stat, idx) => (
          <View key={idx} className="mb-3">
            <View className="flex-row justify-between mb-1">
              <Text className="text-white text-sm font-bold capitalize">
                {stat.name}
              </Text>
              <Text className="text-white text-sm font-bold">{stat.value}</Text>
            </View>
            <View className="bg-white/20 rounded-full h-2 overflow-hidden">
              <View
                className="bg-white h-full"
                style={{ width: `${(stat.value / 150) * 100}%` }}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Cadena Evolutiva */}
      {pokemon.evolutionChain.length > 1 && (
        <View className="mx-4 my-3">
          <Text className="text-white text-lg font-bold mb-3">Cadena Evolutiva</Text>
          <View className="flex-row flex-wrap items-center justify-around">
            {pokemon.evolutionChain.map((evo, idx) => (
              <View key={idx} className="items-center mb-3">
                <TouchableOpacity 
                  onPress={() => router.push(`/pokemon/${evo.id}`)}
                  className="bg-white/20 rounded-xl p-2 mb-2"
                >
                  <Image
                    source={{ uri: evo.sprite }}
                    className="w-20 h-20"
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <Text className="text-white text-xs font-bold">#{evo.id.toString().padStart(3, '0')}</Text>
                <Text className="text-white text-xs capitalize font-bold text-center">{evo.name}</Text>
                <View className="flex-row gap-1 mt-1">
                  {evo.types.map((type, typeIdx) => (
                    <View
                      key={typeIdx}
                      className="px-2 py-1 rounded-full"
                      style={{ backgroundColor: getTypeColor(type) }}
                    >
                      <Text className="text-white text-xs font-bold uppercase">
                        {type}
                      </Text>
                    </View>
                  ))}
                </View>
                {idx < pokemon.evolutionChain.length - 1 && (
                  <Text className="text-white text-lg font-bold mt-2">→</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Mega Evoluciones */}
      {pokemon.megaEvolutions.length > 0 && (
        <View className="mx-4 my-3">
          <Text className="text-white text-lg font-bold mb-3">Mega Evolución</Text>
          <View className="flex-row flex-wrap justify-around">
            {pokemon.megaEvolutions.map((mega, idx) => (
              <View key={idx} className="items-center mb-3 bg-white/10 rounded-xl p-3">
                <Image
                  source={{ uri: mega.sprite }}
                  className="w-24 h-24"
                  resizeMode="contain"
                />
                <Text className="text-white text-xs capitalize font-bold mt-2 text-center">
                  {mega.name}
                </Text>
                <View className="flex-row gap-1 mt-2">
                  {mega.types.map((type, typeIdx) => (
                    <View
                      key={typeIdx}
                      className="px-2 py-1 rounded-full"
                      style={{ backgroundColor: getTypeColor(type) }}
                    >
                      <Text className="text-white text-xs font-bold uppercase">
                        {type}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Formas Alternativas */}
      {pokemon.varieties.length > 1 && (
        <View className="mx-4 my-3 pb-8">
          <Text className="text-white text-lg font-bold mb-3">Formas Alternativas</Text>
          <View className="flex-row flex-wrap justify-around">
            {pokemon.varieties.map((variety, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  const varietyPokemonName = variety.name;
                  // Fetch the ID of this variety
                  fetch(`https://pokeapi.co/api/v2/pokemon/${varietyPokemonName}`)
                    .then(res => res.json())
                    .then(data => router.push(`/pokemon/${data.id}`));
                }}
                className="items-center mb-3 bg-white/10 rounded-xl p-3"
              >
                <Image
                  source={{ uri: variety.sprite }}
                  className="w-24 h-24"
                  resizeMode="contain"
                />
                <Text className="text-white text-xs capitalize font-bold mt-2 text-center">
                  {variety.name}
                </Text>
                <View className="flex-row gap-1 mt-2">
                  {variety.types.map((type, typeIdx) => (
                    <View
                      key={typeIdx}
                      className="px-2 py-1 rounded-full"
                      style={{ backgroundColor: getTypeColor(type) }}
                    >
                      <Text className="text-white text-xs font-bold uppercase">
                        {type}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}