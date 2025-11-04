import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (generation: number | null) => void;
  selectedGeneration: number | null;
}

const GENERATIONS = [
  { id: 0, name: 'Todas las Generaciones' },
  { id: 1, name: 'Generación 1' },
  { id: 2, name: 'Generación 2' },
  { id: 3, name: 'Generación 3' },
  { id: 4, name: 'Generación 4' },
  { id: 5, name: 'Generación 5' },
  { id: 6, name: 'Generación 6' },
  { id: 7, name: 'Generación 7' },
  { id: 8, name: 'Generación 8' },
  { id: 9, name: 'Generación 9' },
];

export default function GenerationModal({ visible, onClose, onSelect, selectedGeneration }: Props) {
  const handleSelect = (genId: number) => {
    onSelect(genId === 0 ? null : genId);
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
            <Text className="text-white text-lg font-extrabold">Generaciones</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>

          {/* Opciones */}
          <FlatList
            data={GENERATIONS}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled
            contentContainerStyle={{ paddingVertical: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item.id)}
                className={`mx-4 mb-3 py-3 px-4 rounded-lg border-2 ${
                  (item.id === 0 && selectedGeneration === null) ||
                  (item.id !== 0 && selectedGeneration === item.id)
                    ? 'bg-white border-white'
                    : 'bg-red-600 border-white/30'
                }`}
              >
                <Text
                  className={`text-center font-extrabold text-base ${
                    (item.id === 0 && selectedGeneration === null) ||
                    (item.id !== 0 && selectedGeneration === item.id)
                      ? 'text-red-500'
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