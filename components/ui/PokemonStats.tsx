import { View, Text } from 'react-native';

interface Stats {
  name: string;
  baseStat: number;
}

interface Props {
  stats: Stats[];
  mainType: string;
}

export default function PokemonStats({ stats, mainType }: Props) {
  const getStatColor = (type: string): string => {
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

  const getStatName = (name: string): string => {
    const statNames: { [key: string]: string } = {
      hp: 'PS',
      attack: 'Ataque',
      defense: 'Defensa',
      'special-attack': 'Ataque Esp.',
      'special-defense': 'Defensa Esp.',
      speed: 'Velocidad'
    };
    return statNames[name] || name;
  };

  return (
    <View>
      <Text className="text-gray-900 text-sm font-semibold mb-3">Estadísticas Base</Text>
      {stats.map((stat, index) => (
        <View key={index} className="mb-3">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-gray-700 text-xs font-bold">
              {getStatName(stat.name)}
            </Text>
            <Text className="text-gray-900 text-xs font-extrabold">
              {stat.baseStat}
            </Text>
          </View>
          <View className="w-full bg-gray-200 rounded-full h-2.5">
            <View
              className={`${getStatColor(mainType)} h-2.5 rounded-full`}
              style={{ width: `${(stat.baseStat / 150) * 100}%` }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
