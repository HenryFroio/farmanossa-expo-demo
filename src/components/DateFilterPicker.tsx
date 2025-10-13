// src/components/DateFilterPicker.tsx
import React, { useState, useEffect } from 'react';
import { Animated, View, Text, TouchableOpacity, Platform, Modal } from 'react-native';
import { Calendar } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import styles from '../styles/statsScreenStyles';

export type DateFilterType = 'daily' | 'weekly' | 'monthly' | 'custom';

interface DateFilterPickerProps {
  selectedFilter: DateFilterType;
  currentDateFilter: {
    startDate: Date;
    endDate: Date;
  };
  onFilterChange: (filter: DateFilterType) => void;
  onDateChange: (startDate: Date, endDate: Date) => void;
  isLoading?: boolean;
}

export const DateFilterPicker: React.FC<DateFilterPickerProps> = ({
  selectedFilter,
  currentDateFilter,
  onFilterChange,
  onDateChange,
  isLoading = false
}) => {
  const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisible] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(currentDateFilter.startDate);
  const [tempEndDate, setTempEndDate] = useState(currentDateFilter.endDate);
  const [lastValidFilter, setLastValidFilter] = useState<DateFilterType>(selectedFilter);
  const [tempDate, setTempDate] = useState(new Date());

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };

  const handleFilterSelect = (filter: DateFilterType) => {
    // Para custom, não chamar onFilterChange imediatamente
    if (filter === 'custom') {
      // Inicializar as datas temporárias com as datas atuais
      setTempStartDate(currentDateFilter.startDate);
      setTempEndDate(currentDateFilter.endDate);
      
      if (Platform.OS === 'ios') {
        setTempDate(currentDateFilter.startDate);
      }
      setStartDatePickerVisible(true);
      return;
    }

    // Sempre salvar o filtro atual como último válido antes de mudar
    setLastValidFilter(selectedFilter);
    onFilterChange(filter);
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    let start = new Date();
    start.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'daily':
        onDateChange(start, today);
        break;
        
      case 'weekly':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        onDateChange(weekStart, today);
        break;
        
      case 'monthly':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        onDateChange(monthStart, today);
        break;
    }
  };

  const handleCancel = () => {
    // Simplesmente fechar os date pickers sem mudar o filtro atual
    setStartDatePickerVisible(false);
    setEndDatePickerVisible(false);
    // Restaurar as datas temporárias para os valores atuais
    setTempStartDate(currentDateFilter.startDate);
    setTempEndDate(currentDateFilter.endDate);
    setTempDate(currentDateFilter.startDate);
  };

  const handleCustomDateConfirm = () => {
    // Usar as datas temporárias que foram selecionadas
    const endOfDay = new Date(tempEndDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const startOfDay = new Date(tempStartDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Agora sim, mudar para custom e aplicar as datas
    setLastValidFilter(selectedFilter);
    onFilterChange('custom');
    onDateChange(startOfDay, endOfDay);
  };

  const handleStartDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setStartDatePickerVisible(false);
      if (event.type === 'set' && date) {
        setTempStartDate(date);
        // NÃO atualizar tempEndDate aqui, deixar o usuário escolher
        setEndDatePickerVisible(true);
      } else {
        handleCancel();
      }
    } else {
      if (date) {
        setTempDate(date);
        setTempStartDate(date);
      }
    }
  };

  const handleEndDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setEndDatePickerVisible(false);
      if (event.type === 'set' && date) {
        setTempEndDate(date);
        // Chamar confirmação com a data selecionada diretamente
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const startOfDay = new Date(tempStartDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        setLastValidFilter(selectedFilter);
        onFilterChange('custom');
        onDateChange(startOfDay, endOfDay);
      } else {
        handleCancel();
      }
    } else {
      if (date) {
        setTempDate(date);
        setTempEndDate(date);
      }
    }
  };

  const handleIOSConfirm = () => {
    if (isStartDatePickerVisible) {
      setTempStartDate(tempDate);
      setStartDatePickerVisible(false);
      setEndDatePickerVisible(true);
      setTempDate(tempEndDate); // Usar a data final atual
    } else {
      setTempEndDate(tempDate);
      setEndDatePickerVisible(false);
      handleCustomDateConfirm();
    }
  };

  const renderIOSPicker = () => (
    <Modal
      transparent
      visible={isStartDatePickerVisible || isEndDatePickerVisible}
      animationType="fade"
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end'
      }}>
        <View style={{
          backgroundColor: 'white',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 16
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0'
          }}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={{
                color: '#FF4B2B',
                fontSize: 16,
                padding: 8
              }}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: '#1A202C'
            }}>
              {isStartDatePickerVisible ? 'Data Inicial' : 'Data Final'}
            </Text>
            <TouchableOpacity onPress={handleIOSConfirm}>
              <Text style={{
                color: '#FF4B2B',
                fontSize: 16,
                fontWeight: 'bold',
                padding: 8
              }}>OK</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="spinner"
            onChange={isStartDatePickerVisible ? handleStartDateChange : handleEndDateChange}
            minimumDate={isEndDatePickerVisible ? tempStartDate : undefined}
            locale="pt-BR"
            style={{
              height: 200,
              backgroundColor: 'white'
            }}
            textColor='black'
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.dateFilterContainer}>
      <Text style={styles.dateFilterTitle}>Período</Text>
      <View style={styles.filterButtonsContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            selectedFilter === 'daily' && styles.filterButtonActive,
            isLoading && styles.filterButtonDisabled
          ]}
          onPress={() => !isLoading && handleFilterSelect('daily')}
          disabled={isLoading}
        >
          <Text style={styles.filterButtonText}>Hoje</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            selectedFilter === 'weekly' && styles.filterButtonActive,
            isLoading && styles.filterButtonDisabled
          ]}
          onPress={() => !isLoading && handleFilterSelect('weekly')}
          disabled={isLoading}
        >
          <Text style={styles.filterButtonText}>Esta Semana</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            selectedFilter === 'monthly' && styles.filterButtonActive,
            isLoading && styles.filterButtonDisabled
          ]}
          onPress={() => !isLoading && handleFilterSelect('monthly')}
          disabled={isLoading}
        >
          <Text style={styles.filterButtonText}>Este Mês</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            selectedFilter === 'custom' && styles.filterButtonActive,
            isLoading && styles.filterButtonDisabled
          ]}
          onPress={() => !isLoading && handleFilterSelect('custom')}
          disabled={isLoading}
        >
          <Calendar size={20} color="#FF4B2B" />
        </TouchableOpacity>
      </View>

      {selectedFilter === 'custom' && (
        <View style={styles.customDateContainer}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setStartDatePickerVisible(true)}
          >
            <Text style={styles.dateButtonText}>
              De: {formatDate(currentDateFilter.startDate)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setEndDatePickerVisible(true)}
          >
            <Text style={styles.dateButtonText}>
              Até: {formatDate(currentDateFilter.endDate)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {Platform.OS === 'android' && (isStartDatePickerVisible || isEndDatePickerVisible) && (
        <DateTimePicker
          value={isStartDatePickerVisible ? tempStartDate : tempStartDate}
          mode="date"
          display="default"
          onChange={isStartDatePickerVisible ? handleStartDateChange : handleEndDateChange}
          minimumDate={isEndDatePickerVisible ? tempStartDate : undefined}
        />
      )}

      {Platform.OS === 'ios' && renderIOSPicker()}
    </View>
  );
};

export default DateFilterPicker;