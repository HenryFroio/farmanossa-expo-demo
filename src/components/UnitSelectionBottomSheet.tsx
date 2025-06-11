// UnitSelectionBottomSheet.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Pressable } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import styles from '../styles/deliveryBottomSheetsStyles';

interface UnitSelectionBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  currentUnit: string;
  onConfirmCurrentUnit: () => void;
  onSelectNewUnit: (unitId: string) => void;
}

const UnitSelectionBottomSheet: React.FC<UnitSelectionBottomSheetProps> = ({
  bottomSheetRef,
  currentUnit,
  onConfirmCurrentUnit,
  onSelectNewUnit,
}) => {
  const [showUnitList, setShowUnitList] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  const units = Array.from({ length: 15 }, (_, i) => ({
    id: `FARMANOSSA F${String(i + 1).padStart(2, '0')}`,
    shortId: `F${String(i + 1).padStart(2, '0')}`
  }));

  const handleUnitSelect = (unitId: string) => {
    setSelectedUnit(unitId);
    onSelectNewUnit(unitId);
  };

  if (!showUnitList) {
    return (
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['40%']}
        enablePanDownToClose
        index={-1}
        backgroundStyle={styles.bottomSheetBackground}
      >
        <View style={styles.bottomSheetContent}>
          <Text style={styles.bottomSheetTitle}>Selecionar Unidade</Text>
          <Text style={[styles.orderAddress, { textAlign: 'center', marginBottom: 20 }]}>
            Deseja prestar serviço para sua unidade padrão? <Text style={{color:'grey'}}>({currentUnit})</Text>
          </Text>
          <View>
            <TouchableOpacity
              style={[styles.confirmButton, { marginBottom: 12 }]}
              onPress={onConfirmCurrentUnit}
            >
              <Text style={styles.confirmButtonText}>Confirmar Unidade Atual</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: '#4A5568' }]}
              onPress={() => setShowUnitList(true)}
            >
              <Text style={styles.confirmButtonText}>Selecionar Outra Unidade</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={['70%']}
      enablePanDownToClose
      index={-1}
      backgroundStyle={styles.bottomSheetBackground}
    >
      <View style={styles.bottomSheetContent}>
        <Text style={styles.bottomSheetTitle}>Selecionar Nova Unidade</Text>
        <FlatList
          data={units}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.motorcycleList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                {
                  flex: 1,
                  margin: 6,
                },
              ]}
              onPress={() => handleUnitSelect(item.id)}
            >
              <View style={[
                styles.motorcycleItem,
                selectedUnit === item.id && styles.selectedMotorcycleItem,
              ]}>
                <Text style={[
                  styles.motorcyclePlate,
                  selectedUnit === item.id && { color: '#e41c26' }
                ]}>
                  {item.shortId}
                </Text>
              </View>
            </Pressable>
          )}
        />
        
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: '#4A5568' }]}
          onPress={() => setShowUnitList(false)}
        >
          <Text style={styles.confirmButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

export default UnitSelectionBottomSheet;