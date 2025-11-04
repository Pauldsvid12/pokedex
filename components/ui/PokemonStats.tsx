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

  const calculateTotal = () => {
    return stats.reduce((total, stat) => total + stat.baseStat, 0);
  };

  return (
    <View className="mx-4 mb-6">
      <Text className="text-white text-lg font-extrabold mb-3">Estadísticas Base</Text>
      <View className="bg-white rounded-lg p-4">
        {stats.map((stat, index) => (
          <View key={index} className="mb-4">
            <View className="flex-row justify-between items-center mb-1.5">
              <Text className="text-gray-800 text-sm font-bold">
                {getStatName(stat.name)}
              </Text>
              <Text className="text-gray-900 text-sm font-extrabold">
                {stat.baseStat}
              </Text>
            </View>
            <View className="w-full bg-gray-200 rounded-full h-3">
              <View
                className={`${getStatColor(mainType)} h-3 rounded-full`}
                style={{ width: `${(stat.baseStat / 150) * 100}%` }}
              />
            </View>
          </View>
        ))}
        
        {/* Total de estadísticas */}
        <View className="mt-4 pt-4 border-t border-gray-300">
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-800 text-sm font-bold">
              Total
            </Text>
            <Text className="text-gray-900 text-sm font-extrabold">
              {calculateTotal()}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
