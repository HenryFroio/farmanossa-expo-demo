import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { X, Clock, MapPin, User, Bike, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { FormData } from '../hooks/useFormsData';

interface FormDetailsBottomSheetProps {
  form: FormData | null;
  bottomSheetRef: React.RefObject<BottomSheet>;
  onClose: () => void;
}

const FormDetailsBottomSheet: React.FC<FormDetailsBottomSheetProps> = ({
  form,
  bottomSheetRef,
  onClose,
}) => {
  const snapPoints = React.useMemo(() => ['25%', '50%', '90%'], []);

  // UseEffect para garantir que o BottomSheet abra quando form for definido
  React.useEffect(() => {
    if (form && bottomSheetRef.current) {
      bottomSheetRef.current.expand();
    }
  }, [form, bottomSheetRef]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return '#10B981';
      case 'attention':
        return '#F59E0B';
      case 'critical':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle size={16} color="#10B981" />;
      case 'attention':
        return <AlertTriangle size={16} color="#F59E0B" />;
      case 'critical':
        return <AlertTriangle size={16} color="#EF4444" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    try {
      if (!dateString) return '--/--/--';
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString || '--/--/--';
    }
  };

  if (!form) {
    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
      >
        <View />
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.bottomSheetIndicator}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Detalhes do Formulário</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {/* Informações Básicas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Básicas</Text>
          
          <View style={styles.infoRow}>
            <User size={16} color="#666" />
            <Text style={styles.infoLabel}>Entregador:</Text>
            <Text style={styles.infoValue}>{form.deliverymanName || 'Nome não informado'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Bike size={16} color="#666" />
            <Text style={styles.infoLabel}>Motocicleta:</Text>
            <Text style={styles.infoValue}>{form.motorcyclePlate || 'Placa não informada'}</Text>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={16} color="#666" />
            <Text style={styles.infoLabel}>Unidade:</Text>
            <Text style={styles.infoValue}>{form.pharmacyUnitName || 'Unidade não informada'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Clock size={16} color="#666" />
            <Text style={styles.infoLabel}>Data:</Text>
            <Text style={styles.infoValue}>{formatDate(form.date)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Clock size={16} color="#666" />
            <Text style={styles.infoLabel}>Horário:</Text>
            <Text style={styles.infoValue}>{form.initialTime || '--:--'} - {form.finalTime || '--:--'}</Text>
          </View>
        </View>

        {/* Quilometragem */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quilometragem</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Km Atual:</Text>
            <Text style={styles.infoValue}>{form.currentKm || '0'} km</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Próxima Manutenção:</Text>
            <Text style={styles.infoValue}>{form.nextMaintenanceKm || 'Não informado'} km</Text>
          </View>
        </View>

        {/* Itens de Segurança */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itens de Segurança</Text>
          {(form.safetyItems || []).map((item, index) => (
            <View key={index} style={styles.checkItem}>
              {getStatusIcon(item.status)}
              <Text style={styles.checkItemText}>{item.name}</Text>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          ))}
          {(!form.safetyItems || form.safetyItems.length === 0) && (
            <Text style={styles.infoValue}>Nenhum item de segurança registrado</Text>
          )}
        </View>

        {/* Itens de Rotina */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itens de Rotina</Text>
          {(form.routineItems || []).map((item, index) => (
            <View key={index} style={styles.checkItem}>
              {getStatusIcon(item.status)}
              <Text style={styles.checkItemText}>{item.name}</Text>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          ))}
          {(!form.routineItems || form.routineItems.length === 0) && (
            <Text style={styles.infoValue}>Nenhum item de rotina registrado</Text>
          )}
        </View>

        {/* Observações */}
        {form.observations && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <Text style={styles.observationsText}>{form.observations}</Text>
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetIndicator: {
    backgroundColor: '#D1D5DB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    minWidth: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginVertical: 2,
    gap: 8,
  },
  checkItemText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  observationsText: {
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    lineHeight: 20,
  },
});

export default FormDetailsBottomSheet;