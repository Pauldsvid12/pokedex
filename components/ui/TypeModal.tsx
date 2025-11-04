import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: string | null) => void;
  selectedType: string | null;
}

const TYPES = [
  { name: 'Todos los Tipos', value: null },
  { name: 'Normal', value: 'normal' },
  { name: 'Fuego', value: 'fire' },
  { name: 'Agua', value: 'water' },
  { name: 'Planta', value: 'grass' },
  { name: 'Eléctrico', value: 'electric' },
  { name: 'Hielo', value: 'ice' },
  { name: 'Lucha', value: 'fighting' },
  { name: 'Veneno', value: 'poison' },
  { name: 'Tierra', value: 'ground' },
  { name: 'Volador', value: 'flying' },
  { name: 'Psíquico', value: 'psychic' },
  { name: 'Bicho', value: 'bug' },
  { name: 'Roca', value: 'rock' },
  { name: 'Fantasma', value: 'ghost' },
  { name: 'Dragón', value: 'dragon' },
  { name: 'Siniestro', value: 'dark' },
  { name: 'Acero', value: 'steel' },
  { name: 'Hada', value: 'fairy' },
];

export default function TypeModal({ visible, onClose, onSelect, selectedType }: Props) {
  const getTypeColor = (type: string | null): string => {
    const typeColors: { [key: string]: string } = {
      normal: 'bg-gray-400',
      fire: 'bg-orange-500',
      water: 'bg-blue-500',
      grass: 'bg-green-500',
      electric: 'bg-yellow-400',
      ice: 'bg-cyan-400',
      fighting: 'bg-red-600',
      poison: 'bg-purple-500',
      ground: 'bg-amber-600',
      flying: 'bg-indigo-400',
      psychic: 'bg-pink-500',
      bug: 'bg-lime-500',
      rock: 'bg-stone-500',
      ghost: 'bg-purple-700',
      dragon: 'bg-indigo-600',
      dark: 'bg-gray-700',
      steel: 'bg-slate-400',
      fairy: 'bg-pink-400',
    };
    return type ? typeColors[type] || 'bg-gray-400' : 'bg-red-600';
  };

  const handleSelect = (type: string | null) => {
    onSelect(type);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <View className="flex-1" />
        <View className="bg-red-500 rounded-t-3xl max-h-96">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-red-600">
            <Text className="text-white text-lg font-extrabold">Tipos</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>

          {/* Opciones */}
          <FlatList
            data={TYPES}
            keyExtractor={(item) => item.value || 'all'}
            scrollEnabled
            contentContainerStyle={{ paddingVertical: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item.value)}
                className={`mx-4 mb-3 py-3 px-4 rounded-lg border-2 ${
                  selectedType === item.value
                    ? `${getTypeColor(item.value)} border-white`
                    : 'bg-red-600 border-white/30'
                }`}
              >
                <Text
                  className={`text-center font-extrabold text-base ${
                    selectedType === item.value
                      ? item.value ? 'text-white' : 'text-white'
                      : 'text-white'
                  }`}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}