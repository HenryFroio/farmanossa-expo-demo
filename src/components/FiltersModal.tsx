import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Search, X, Filter } from 'lucide-react-native';
import { FormsFilters } from '../hooks/useFormsData';

interface FiltersModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FormsFilters;
  onApplyFilters: (filters: FormsFilters) => void;
  onClearFilters: () => void;
}

const FiltersModal: React.FC<FiltersModalProps> = ({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onClearFilters,
}) => {
  const [localFilters, setLocalFilters] = useState<FormsFilters>(filters);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(
    filters.selectedDate ? new Date(filters.selectedDate) : new Date()
  );

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const formatDisplayDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      const formattedDate = formatDate(date);
      setLocalFilters(prev => ({ ...prev, selectedDate: formattedDate }));
    }
  };

  const handleApplyFilters = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    setSelectedDate(new Date());
    onClearFilters();
    onClose();
  };

  const hasActiveFilters = Object.values(localFilters).some(value => 
    value !== undefined && value !== null && value !== ''
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Filtros</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Filtro por Data */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Data do Formulário</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={20} color="#6B7280" />
              <Text style={styles.dateButtonText}>
                {localFilters.selectedDate 
                  ? formatDisplayDate(localFilters.selectedDate)
                  : 'Selecionar data'
                }
              </Text>
            </TouchableOpacity>
            {localFilters.selectedDate && (
              <TouchableOpacity
                style={styles.clearDateButton}
                onPress={() => setLocalFilters(prev => ({ ...prev, selectedDate: undefined }))}
              >
                <Text style={styles.clearDateText}>Limpar data</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filtro por Placa */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Placa da Motocicleta</Text>
            <View style={styles.inputContainer}>
              <Search size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Digite a placa (ex: ABC-1234)"
                value={localFilters.plateSearch || ''}
                onChangeText={(text) => 
                  setLocalFilters(prev => ({ ...prev, plateSearch: text }))
                }
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {localFilters.plateSearch && (
                <TouchableOpacity
                  onPress={() => setLocalFilters(prev => ({ ...prev, plateSearch: '' }))}
                  style={styles.clearInputButton}
                >
                  <X size={16} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, styles.clearButton]}
            onPress={handleClearFilters}
            disabled={!hasActiveFilters}
          >
            <Text style={[
              styles.clearButtonText,
              !hasActiveFilters && styles.disabledButtonText
            ]}>
              Limpar Filtros
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.footerButton, styles.applyButton]}
            onPress={handleApplyFilters}
          >
            <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#374151',
  },
  clearDateButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearDateText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  clearInputButton: {
    padding: 4,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  applyButton: {
    backgroundColor: '#e41c26',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default FiltersModal;