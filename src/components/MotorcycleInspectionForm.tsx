// src/components/MotorcycleInspectionForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { CheckCircle2, AlertTriangle, XCircle, ChevronRight } from 'lucide-react-native';
import { useDeliveryman } from '../hooks/useDeliveryman';

const { width, height } = Dimensions.get('window');

export interface InspectionItem {
  id: string;
  name: string;
  status: 'ok' | 'atencao' | 'defeito' | null;
}

export interface InspectionFormData {
  id: string;
  deliverymanId: string;
  deliverymanName: string;
  motorcyclePlate: string;
  pharmacyUnitId: string;
  pharmacyUnitName: string;
  date: string;
  initialTime: string;
  finalTime?: string;
  currentKm: string;
  nextMaintenanceKm: string;
  safetyItems: InspectionItem[];
  routineItems: InspectionItem[];
  observations: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MotorcycleInspectionFormProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  deliverymanName: string;
  motorcyclePlate: string;
  motorcycleId: string;
  pharmacyUnitName: string;
  deliverymanId: string;
  pharmacyUnitId: string;
  onSubmit: (formData: InspectionFormData, formId: string) => Promise<void>;
  onClose: () => void;
  onAfterClose?: () => void;
}

const SAFETY_ITEMS: Omit<InspectionItem, 'status'>[] = [
  { id: 'freio_regulagem_desgaste', name: 'FREIO (REGULAGEM, DESGASTE)' },
  { id: 'pneu_traseiro_dianteiro', name: 'PNEU TRASEIRO / DIANTEIRO' },
  { id: 'luz_freio_manete_pedal', name: 'LUZ DE FREIO (MANETE / PEDAL)' },
  { id: 'retrovisores', name: 'RETROVISORES' },
  { id: 'farol_alto_baixo', name: 'FAROL ALTO E BAIXO' },
  { id: 'buzina', name: 'BUZINA' },
  { id: 'setas', name: 'SETAS' },
];

const ROUTINE_ITEMS: Omit<InspectionItem, 'status'>[] = [
  { id: 'motor_vazamento', name: 'MOTOR / VAZAMENTO' },
  { id: 'cavalete_lateral', name: 'CAVALETE LATERAL' },
  { id: 'luzes_painel_neutro', name: 'LUZES DO PAINEL (ILUMINAÇÃO, NEUTRO, ETC)' },
  { id: 'relacao_corrente_coroa', name: 'RELAÇÃO (CORRENTE E COROA)' },
  { id: 'manete_freio_embreagem', name: 'MANETE DE FREIO / EMBREAGEM' },
  { id: 'amortecedor_traseiro', name: 'AMORTECEDOR TRASEIRO' },
  { id: 'amortecedor_dianteiro', name: 'AMORTECEDOR DIANTEIRO' },
  { id: 'escapamento', name: 'ESCAPAMENTO' },
  { id: 'bau', name: 'BAÚ' },
  { id: 'banco', name: 'BANCO' },
  { id: 'carenagem_geral', name: 'CARENAGEM EM GERAL' },
];

export const MotorcycleInspectionForm: React.FC<MotorcycleInspectionFormProps> = ({
  bottomSheetRef,
  deliverymanName,
  motorcyclePlate,
  motorcycleId,
  pharmacyUnitName,
  deliverymanId,
  pharmacyUnitId,
  onSubmit,
  onClose,
  onAfterClose,
}) => {
  const { getMotorcycleKm, getMotorcycleNextMaintenanceKm, updateMotorcycleData, saveInspectionForm } = useDeliveryman();
  
  const [currentKm, setCurrentKm] = useState('');
  const [nextMaintenanceKm, setNextMaintenanceKm] = useState('');
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isProgrammaticCloseRef = useRef(false);
  const [loadingKm, setLoadingKm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const hasLoadedKm = useRef(false);
  const scrollViewRef = useRef<any>(null);
  const isResetting = useRef(false);
  const [isClosing, setIsClosing] = useState(false);

  // Function to reset form - will be called only after bottom sheet closes
  const resetForm = () => {
    if (isResetting.current) {
      console.log('[MotorcycleInspectionForm] Reset já em andamento, ignorando...');
      return;
    }
    
    isResetting.current = true;
    console.log('[MotorcycleInspectionForm] Resetando formulário...');
    
    setCurrentKm('');
    setNextMaintenanceKm('');
    setObservations('');
    setSuccessMessage('');
    setIsClosing(false); // Reset closing state
    
    // Reset inspection items to default state
    setSafetyItems(SAFETY_ITEMS.map(item => ({ ...item, status: null })));
    setRoutineItems(ROUTINE_ITEMS.map(item => ({ ...item, status: null })));
    
    // Reset scroll position to top
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      // Reset the flag after everything is done
      setTimeout(() => {
        isResetting.current = false;
      }, 200);
    }, 100);
  };

  const [safetyItems, setSafetyItems] = useState<InspectionItem[]>(
    SAFETY_ITEMS.map(item => ({ ...item, status: null }))
  );

  const [routineItems, setRoutineItems] = useState<InspectionItem[]>(
    ROUTINE_ITEMS.map(item => ({ ...item, status: null }))
  );

  // Load current motorcycle km when component mounts
  useEffect(() => {
    const loadMotorcycleData = async () => {
      if (!motorcycleId || hasLoadedKm.current) {
        return;
      }

      // Check if motorcycleId looks like a valid ID (not a plate with spaces)
      if (motorcycleId.includes(' ')) {
        console.warn('[MotorcycleInspectionForm] Invalid motorcycleId format (contains spaces):', motorcycleId);
        return;
      }
      
      try {
        setLoadingKm(true);
        hasLoadedKm.current = true;
        
        // Load both current km and next maintenance km
        const [km, nextMaintenanceKm] = await Promise.all([
          getMotorcycleKm(motorcycleId),
          getMotorcycleNextMaintenanceKm(motorcycleId)
        ]);
        
        if (km !== null) {
          // Convert to integer to avoid decimal places
          setCurrentKm(Math.round(km).toString());
        }
        
        if (nextMaintenanceKm !== null) {
          // Convert to integer to avoid decimal places
          setNextMaintenanceKm(Math.round(nextMaintenanceKm).toString());
        }
      } catch (error) {
        console.error('[MotorcycleInspectionForm] Erro ao carregar dados da moto:', error);
        hasLoadedKm.current = false; // Reset on error so user can retry
      } finally {
        setLoadingKm(false);
      }
    };

    // Only reset hasLoadedKm when motorcycleId changes
    hasLoadedKm.current = false;
    
    loadMotorcycleData();
  }, [motorcycleId, getMotorcycleKm, getMotorcycleNextMaintenanceKm]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const updateItemStatus = (
    items: InspectionItem[],
    setItems: React.Dispatch<React.SetStateAction<InspectionItem[]>>,
    itemId: string,
    status: 'ok' | 'atencao' | 'defeito'
  ) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, status } : item
      )
    );
  };

  const selectAllItems = (
    setItems: React.Dispatch<React.SetStateAction<InspectionItem[]>>,
    status: 'ok' | 'atencao' | 'defeito'
  ) => {
    setItems(prev =>
      prev.map(item => ({ ...item, status }))
    );
  };

  const renderStatusButton = (
    status: 'ok' | 'atencao' | 'defeito',
    currentStatus: InspectionItem['status'],
    onPress: () => void
  ) => {
    const isSelected = currentStatus === status;
    const buttonConfig = {
      ok: { 
        icon: CheckCircle2, 
        color: '#10B981', 
        bgColor: isSelected ? '#10B981' : '#F0FDF4',
        textColor: isSelected ? '#FFFFFF' : '#10B981',
        text: 'OK'
      },
      atencao: { 
        icon: AlertTriangle, 
        color: '#F59E0B', 
        bgColor: isSelected ? '#F59E0B' : '#FFFBEB',
        textColor: isSelected ? '#FFFFFF' : '#F59E0B',
        text: 'ATENÇÃO'
      },
      defeito: { 
        icon: XCircle, 
        color: '#EF4444', 
        bgColor: isSelected ? '#EF4444' : '#FEF2F2',
        textColor: isSelected ? '#FFFFFF' : '#EF4444',
        text: 'DEFEITO'
      }
    };

    const config = buttonConfig[status];
    const IconComponent = config.icon;

    return (
      <TouchableOpacity
        style={[
          styles.statusButton,
          { backgroundColor: config.bgColor }
        ]}
        onPress={isSubmitting ? undefined : onPress}
        activeOpacity={isSubmitting ? 1 : 0.7}
        disabled={isSubmitting}
      >
        <IconComponent size={16} color={config.textColor} />
        <Text style={[styles.statusButtonText, { color: config.textColor }]}>
          {config.text}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSelectAllButtons = (
    setItems: React.Dispatch<React.SetStateAction<InspectionItem[]>>
  ) => (
    <View style={styles.selectAllContainer}>
      <Text style={styles.selectAllLabel}>Selecionar todos:</Text>
      <View style={styles.selectAllButtonsContainer}>
        <TouchableOpacity
          style={[styles.selectAllButton, styles.selectAllOk]}
          onPress={isSubmitting ? undefined : () => selectAllItems(setItems, 'ok')}
          activeOpacity={isSubmitting ? 1 : 0.7}
          disabled={isSubmitting}
        >
          <CheckCircle2 size={14} color="#FFFFFF" />
          <Text style={styles.selectAllButtonText}>OK</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.selectAllButton, styles.selectAllAtencao]}
          onPress={isSubmitting ? undefined : () => selectAllItems(setItems, 'atencao')}
          activeOpacity={isSubmitting ? 1 : 0.7}
          disabled={isSubmitting}
        >
          <AlertTriangle size={14} color="#FFFFFF" />
          <Text style={styles.selectAllButtonText}>ATENÇÃO</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.selectAllButton, styles.selectAllDefeito]}
          onPress={isSubmitting ? undefined : () => selectAllItems(setItems, 'defeito')}
          activeOpacity={isSubmitting ? 1 : 0.7}
          disabled={isSubmitting}
        >
          <XCircle size={14} color="#FFFFFF" />
          <Text style={styles.selectAllButtonText}>DEFEITO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInspectionItem = (
    item: InspectionItem,
    items: InspectionItem[],
    setItems: React.Dispatch<React.SetStateAction<InspectionItem[]>>
  ) => (
    <View key={item.id} style={styles.inspectionItem}>
      <Text style={styles.itemName}>{item.name}</Text>
      <View style={styles.statusButtonsContainer}>
        {renderStatusButton('ok', item.status, () => updateItemStatus(items, setItems, item.id, 'ok'))}
        {renderStatusButton('atencao', item.status, () => updateItemStatus(items, setItems, item.id, 'atencao'))}
        {renderStatusButton('defeito', item.status, () => updateItemStatus(items, setItems, item.id, 'defeito'))}
      </View>
    </View>
  );

  const validateForm = (): boolean => {
    if (!currentKm.trim()) {
      Alert.alert('Erro', 'Por favor, informe a quilometragem atual.');
      return false;
    }

    if (!nextMaintenanceKm.trim()) {
      Alert.alert('Erro', 'Por favor, informe a quilometragem da próxima troca.');
      return false;
    }

    const incompleteSafetyItems = safetyItems.filter(item => item.status === null);
    if (incompleteSafetyItems.length > 0) {
      Alert.alert('Erro', 'Por favor, avalie todos os itens de segurança.');
      return false;
    }

    const incompleteRoutineItems = routineItems.filter(item => item.status === null);
    if (incompleteRoutineItems.length > 0) {
      Alert.alert('Erro', 'Por favor, avalie todos os itens de rotina.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSuccessMessage('');
    
    try {
      const now = new Date();
      const formData: InspectionFormData = {
        id: `${Date.now()}-${deliverymanId}`,
        deliverymanId,
        deliverymanName,
        motorcyclePlate,
        pharmacyUnitId,
        pharmacyUnitName,
        date: now.toISOString().split('T')[0],
        initialTime: now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        currentKm: currentKm.trim(),
        nextMaintenanceKm: nextMaintenanceKm.trim(),
        safetyItems,
        routineItems,
        observations: observations.trim(),
        createdAt: now,
        updatedAt: now,
      };

      // Save form to Firestore and get the document ID
      const formId = await saveInspectionForm(formData);
      
      // Update motorcycle km and next maintenance km
      await updateMotorcycleData(
        motorcycleId, 
        parseFloat(currentKm),
        parseFloat(nextMaintenanceKm)
      );

      // Call the onSubmit callback with form data and form ID
      await onSubmit(formData, formId);
      
      // Show success message
      setSuccessMessage('Formulário salvo com sucesso!');
      
      // Close modal after a short delay
      setTimeout(() => {
        console.log('[MotorcycleInspectionForm] Fechamento automático após sucesso...');
        isProgrammaticCloseRef.current = true; // Mark as programmatic close
        onClose();
        
        // Reset form after bottom sheet is fully closed (only once)
        setTimeout(() => {
          resetForm();
          onAfterClose?.();
        }, 500); // Wait for bottom sheet close animation
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
      Alert.alert('Erro', 'Não foi possível salvar o formulário. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle manual close
  const handleClose = () => {
    if (isResetting.current || isClosing) {
      return;
    }
    
    setIsClosing(true); // Set loading state
    
    // Don't mark as programmatic - let handleSheetChange detect it as manual close
    bottomSheetRef.current?.close();
    
    // Reset form after bottom sheet is fully closed (only once)
    setTimeout(() => {
      resetForm();
      onAfterClose?.();
    }, 500); // Wait for bottom sheet close animation
  };

  // Handle bottom sheet changes (for drag down detection)
  const handleSheetChange = (index: number) => {
    // Only call onClose when user drags down (index -1) AND it's not programmatic
    if (index === -1 && !isProgrammaticCloseRef.current) {
      setIsClosing(true); // Set loading state for drag down
      onClose();
      
      // Reset form after bottom sheet is fully closed
      setTimeout(() => {
        resetForm();
        onAfterClose?.();
      }, 500);
    }
    
    // Reset flag when sheet closes
    if (index === -1) {
      setTimeout(() => {
        isProgrammaticCloseRef.current = false;
      }, 500);
    }
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['90%']}
      enablePanDownToClose={false}
      enableHandlePanningGesture={false}
      enableContentPanningGesture={false}
      backgroundStyle={styles.bottomSheetBackground}
      handleComponent={null}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onChange={handleSheetChange}
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Inspeção de Motocicleta</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <XCircle size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={true}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Informações Gerais */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações Gerais</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Motociclista:</Text>
                <Text style={styles.infoValue}>{deliverymanName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Placa:</Text>
                <Text style={styles.infoValue}>{motorcyclePlate}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Data:</Text>
                <Text style={styles.infoValue}>{new Date().toLocaleDateString('pt-BR')}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Hora:</Text>
                <Text style={styles.infoValue}>
                  {new Date().toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZone: 'America/Sao_Paulo' 
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Quilometragem */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quilometragem</Text>
            
            <View style={styles.inputCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>KM Atual *</Text>
                {loadingKm ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#e41c26" />
                    <Text style={styles.loadingText}>Carregando dados da moto...</Text>
                  </View>
                ) : (
                  <TextInput
                    style={styles.textInput}
                    value={currentKm}
                    onChangeText={setCurrentKm}
                    placeholder={currentKm ? "Digite a quilometragem atual" : "KM não encontrada - digite manualmente"}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                    editable={!isSubmitting}
                  />
                )}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>KM Próxima Manutenção *</Text>
                <TextInput
                  style={styles.textInput}
                  value={nextMaintenanceKm}
                  onChangeText={setNextMaintenanceKm}
                  placeholder={nextMaintenanceKm ? "Digite a KM da próxima manutenção" : "KM próxima manutenção não encontrada - digite manualmente"}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                  editable={!isSubmitting}
                />
              </View>
            </View>
          </View>

          {/* Itens de Segurança */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Itens de Segurança</Text>
            <Text style={styles.sectionSubtitle}>Avalie todos os itens abaixo</Text>
            
            {renderSelectAllButtons(setSafetyItems)}
            
            <View style={styles.inspectionCard}>
              {safetyItems.map(item => renderInspectionItem(item, safetyItems, setSafetyItems))}
            </View>
          </View>

          {/* Itens de Rotina */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Itens de Rotina</Text>
            <Text style={styles.sectionSubtitle}>Avalie todos os itens abaixo</Text>
            
            {renderSelectAllButtons(setRoutineItems)}
            
            <View style={styles.inspectionCard}>
              {routineItems.map(item => renderInspectionItem(item, routineItems, setRoutineItems))}
            </View>
          </View>

          {/* Observações */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            
            <View style={styles.inputCard}>
              <TextInput
                style={styles.textAreaInput}
                value={observations}
                onChangeText={setObservations}
                placeholder="Digite suas observações aqui..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Notificação de Sucesso */}
          {successMessage ? (
            <View style={styles.successNotification}>
              <CheckCircle2 size={20} color="#10B981" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Botões de Ação */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, (isSubmitting || isClosing) && styles.cancelButtonDisabled]}
              onPress={handleClose}
              disabled={isSubmitting || isClosing}
              activeOpacity={0.7}
            >
              {isClosing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#4A5568" style={{ marginRight: 8 }} />
                  <Text style={styles.cancelButtonText}>Fechando...</Text>
                </View>
              ) : (
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Salvando...' : 'Confirmar'}
              </Text>
              {!isSubmitting && <ChevronRight size={20} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>

          {/* Espaçamento final */}
          <View style={styles.bottomSpacing} />
        </BottomSheetScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  infoValue: {
    fontSize: 14,
    color: '#1A202C',
    fontWeight: '500',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A202C',
    backgroundColor: '#FFFFFF',
  },
  textAreaInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A202C',
    backgroundColor: '#FFFFFF',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inspectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inspectionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3748',
    marginBottom: 8,
    lineHeight: 20,
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: width * 0.22,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    paddingHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flex: 0.45,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#4A5568',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#e41c26',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flex: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E0',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  successNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  successText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
  selectAllContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectAllLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  selectAllButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 0.3,
    justifyContent: 'center',
  },
  selectAllOk: {
    backgroundColor: '#10B981',
  },
  selectAllAtencao: {
    backgroundColor: '#F59E0B',
  },
  selectAllDefeito: {
    backgroundColor: '#EF4444',
  },
  selectAllButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
});