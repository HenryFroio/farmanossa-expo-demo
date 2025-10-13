// UnitSelectionBottomSheet.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import styles from '../styles/deliveryBottomSheetsStyles';

interface UnitSelectionBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  currentUnit: string;
  onConfirmCurrentUnit: () => void;
  onSelectNewUnit: (unitId: string) => void;
  onClose?: () => void;
  isConfirmingUnit?: boolean;
  isSelectingNewUnit?: boolean;
}

const UnitSelectionBottomSheet: React.FC<UnitSelectionBottomSheetProps> = ({
  bottomSheetRef,
  currentUnit,
  onConfirmCurrentUnit,
  onSelectNewUnit,
  onClose,
  isConfirmingUnit = false,
  isSelectingNewUnit = false,
}) => {
  const [showUnitList, setShowUnitList] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const isProgrammaticCloseRef = React.useRef(false);

  // Reset states when loading completes
  useEffect(() => {
    if (!isSelectingNewUnit && !isConfirmingUnit) {
      setSelectedUnit(null);
      setShowUnitList(false);
    }
  }, [isSelectingNewUnit, isConfirmingUnit]);
  
  const handleSheetChange = (index: number) => {
    // Only call onClose when user drags down to close (index becomes -1)
    // AND it's not a programmatic close
    if (index === -1 && onClose && !isProgrammaticCloseRef.current) {
      onClose();
      // Reset state
      setShowUnitList(false);
      setSelectedUnit(null);
    }
    
    // Reset flag when sheet closes
    if (index === -1) {
      setTimeout(() => {
        isProgrammaticCloseRef.current = false;
      }, 500);
    }
  };

  const units = Array.from({ length: 15 }, (_, i) => ({
    id: `FARMANOSSA F${String(i + 1).padStart(2, '0')}`,
    shortId: `F${String(i + 1).padStart(2, '0')}`
  }));

  const handleUnitSelect = (unitId: string) => {
    // Set selection and loading state immediately for instant feedback
    setSelectedUnit(unitId);
    isProgrammaticCloseRef.current = true; // Mark as programmatic close
    
    // Defer actual callback to next tick to ensure UI updates first
    setTimeout(() => {
      onSelectNewUnit(unitId);
    }, 0);
  };
  
  const handleConfirmCurrentUnit = () => {
    isProgrammaticCloseRef.current = true; // Mark as programmatic close
    onConfirmCurrentUnit();
  };

  const handleBackToConfirmation = () => {
    setShowUnitList(false);
    setSelectedUnit(null); // Clear selection when going back
    // Força o BottomSheet a se reposicionar para a altura menor
    setTimeout(() => {
      bottomSheetRef.current?.snapToIndex(0);
    }, 100);
  };

  const handleShowUnitList = () => {
    setShowUnitList(true);
    // Força o BottomSheet a expandir para a altura maior
    setTimeout(() => {
      bottomSheetRef.current?.snapToIndex(0);
    }, 100);
  };

  const snapPoints = showUnitList ? ['80%', '90%'] : ['45%', '55%'];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      index={-1}
      backgroundStyle={styles.bottomSheetBackground}
      onChange={handleSheetChange}
    >
      <View style={styles.bottomSheetContent}>
        {!showUnitList ? (
          // Tela de confirmação
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <View>
              <Text style={styles.bottomSheetTitle}>Selecionar Unidade</Text>
              <Text style={[styles.orderAddress, { textAlign: 'center', marginBottom: 20 }]}>
                Deseja prestar serviço para sua unidade padrão? <Text style={{color:'grey'}}>({currentUnit})</Text>
              </Text>
            </View>
            <View style={{ paddingBottom: 10 }}>
              <TouchableOpacity
                style={[styles.confirmButton, { marginBottom: 12 }, isConfirmingUnit && { opacity: 0.7 }]}
                onPress={isConfirmingUnit ? undefined : handleConfirmCurrentUnit}
                disabled={isConfirmingUnit}
              >
                {isConfirmingUnit ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.confirmButtonText}>Confirmando...</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmButtonText}>Confirmar Unidade Atual</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: '#4A5568' }]}
                onPress={handleShowUnitList}
              >
                <Text style={styles.confirmButtonText}>Selecionar Outra Unidade</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Tela de seleção de unidades
          <View style={{ flex: 1 }}>
            <Text style={styles.bottomSheetTitle}>Selecionar Nova Unidade</Text>
            
            <BottomSheetFlatList
              data={units}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 4, paddingTop: 10 }}
              showsVerticalScrollIndicator={true}
              columnWrapperStyle={{ justifyContent: 'flex-start' }}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    {
                      width: '31%',
                      margin: '1%',
                      minWidth: 80,
                    },
                  ]}
                  onPress={() => handleUnitSelect(item.id)}
                  disabled={isSelectingNewUnit}
                >
                  <View style={[
                    styles.motorcycleItem,
                    { paddingVertical: 12, marginBottom: 0 },
                    selectedUnit === item.id && styles.selectedMotorcycleItem,
                    isSelectingNewUnit && selectedUnit !== item.id && { opacity: 0.5 }
                  ]}>
                    {isSelectingNewUnit && selectedUnit === item.id ? (
                      <ActivityIndicator size="small" color="#e41c26" />
                    ) : (
                      <Text style={[
                        styles.motorcyclePlate,
                        selectedUnit === item.id && { color: '#e41c26' }
                      ]}>
                        {item.shortId}
                      </Text>
                    )}
                  </View>
                </Pressable>
              )}
              ListFooterComponent={
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: '#4A5568', marginTop: 16, marginHorizontal: 4 }]}
                  onPress={handleBackToConfirmation}
                  disabled={isSelectingNewUnit}
                >
                  <Text style={styles.confirmButtonText}>Voltar</Text>
                </TouchableOpacity>
              }
            />
          </View>
        )}
      </View>
    </BottomSheet>
  );
};

export default UnitSelectionBottomSheet;