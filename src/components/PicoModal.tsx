// src/components/PicoModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getPicoDataForUnit, PicoData } from '../hooks/useStatsData';
import pontoModalStyles from '../styles/pontoModalStyles';

interface PicoModalProps {
  visible: boolean;
  onClose: () => void;
  unitId?: string; // ID da unidade para buscar os dados
  unitName?: string; // Nome da unidade (opcional)
}

const PicoModal: React.FC<PicoModalProps> = ({ visible, onClose, unitId, unitName }) => {
  const [picoData, setPicoData] = useState<PicoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Função para buscar os dados de pico
  const fetchPicoData = async (date: string) => {
    if (!unitId) {
      Alert.alert('Erro', 'ID da unidade não fornecido');
      return;
    }

    setLoading(true);
    try {
      const data = await getPicoDataForUnit(unitId, date);
      setPicoData(data);
    } catch (error) {
      console.error('Erro ao buscar dados de pico:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados de pico');
    } finally {
      setLoading(false);
    }
  };

  // Buscar dados quando o modal abrir ou a data mudar
  useEffect(() => {
    if (visible && unitId) {
      fetchPicoData(selectedDate);
    }
  }, [visible, unitId, selectedDate]);

  // Função para formatar a data em português
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('pt-BR', options);
  };

  // Função para mudar a data
  const changeDate = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };
  // Encontrar o horário de pico (maior número de pedidos)
  const getMaxOrderCount = () => {
    return Math.max(...picoData.map(data => data.orderCount));
  };
  // Função para calcular cor baseada na intensidade (frio para quente)
  const getIntensityColor = (orderCount: number, maxCount: number) => {
    if (orderCount === 0) return '#F5F5F5'; // Cinza muito claro para zero
    
    // Calcular intensidade de 0 a 1
    const intensity = orderCount / maxCount;
    
    // Paleta de cores suave de frio para quente
    if (intensity <= 0.15) {
      // Muito baixo: Azul muito claro
      return '#E8F4FD'; 
    } else if (intensity <= 0.3) {
      // Baixo: Azul claro
      return '#64B5F6'; 
    } else if (intensity <= 0.45) {
      // Médio-baixo: Azul-ciano
      return '#4FC3F7'; 
    } else if (intensity <= 0.6) {
      // Médio: Ciano-verde
      return '#4DD0E1'; 
    } else if (intensity <= 0.75) {
      // Médio-alto: Verde-amarelo
      return '#FFB74D'; 
    } else if (intensity <= 0.9) {
      // Alto: Laranja
      return '#FF8A65'; 
    } else {
      // Muito alto: Laranja-vermelho (mas não o pico)
      return '#FF7043'; 
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={pontoModalStyles.container}>
        {/* Header */}
        <View style={pontoModalStyles.header}>
          <TouchableOpacity onPress={onClose} style={pontoModalStyles.closeButton}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>          
          <Text style={pontoModalStyles.title}>
            Registro de Pico{unitName ? ` - ${unitName}` : ''}
          </Text>
          <View style={pontoModalStyles.placeholder} />
        </View>

        {/* Date Navigation */}
        <View style={pontoModalStyles.dateNavigation}>
          <TouchableOpacity 
            onPress={() => changeDate(-1)} 
            style={pontoModalStyles.dateNavButton}
          >
            <MaterialIcons name="chevron-left" size={24} color="#666" />
          </TouchableOpacity>
          
          <Text style={pontoModalStyles.dateText}>
            {formatDate(selectedDate)}
          </Text>
          
          <TouchableOpacity 
            onPress={() => changeDate(1)} 
            style={pontoModalStyles.dateNavButton}
          >
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={pontoModalStyles.content}>
          {loading ? (
            <View style={pontoModalStyles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF4B2B" />
              <Text style={pontoModalStyles.loadingText}>Carregando dados...</Text>
            </View>
          ) : (
            <View style={pontoModalStyles.pontoContainer}>
              <View style={pontoModalStyles.infoCard}>
                <MaterialIcons name="timeline" size={20} color="#FF4B2B" />
                <Text style={pontoModalStyles.infoText}>
                  Horários de funcionamento: 07:00 às 01:00
                </Text>
              </View>
              
              {picoData.length > 0 ? (
                <>
                  <Text style={pontoModalStyles.sectionTitle}>
                    Pedidos por Horário
                  </Text>
                  
                  {picoData.map((data, index) => {
                    const isHighest = data.orderCount === getMaxOrderCount() && data.orderCount > 0;
                    return (
                      <View 
                        key={`${data.hour}-${index}`} 
                        style={[
                          pontoModalStyles.timeCard,
                          isHighest && pontoModalStyles.peakTimeCard
                        ]}
                      >
                        <View style={pontoModalStyles.timeHeader}>
                          <View style={pontoModalStyles.timeInfo}>
                            <MaterialIcons 
                              name="schedule" 
                              size={16} 
                              color={isHighest ? "#FF4B2B" : "#666"} 
                            />
                            <Text style={[
                              pontoModalStyles.timeLabel,
                              isHighest && pontoModalStyles.peakTimeLabel
                            ]}>
                              {data.formattedHour}
                            </Text>
                          </View>
                          
                          <View style={pontoModalStyles.orderCountContainer}>
                            <Text style={[
                              pontoModalStyles.orderCount,
                              isHighest && pontoModalStyles.peakOrderCount
                            ]}>
                              {data.orderCount}
                            </Text>
                            <Text style={[
                              pontoModalStyles.orderCountLabel,
                              isHighest && pontoModalStyles.peakOrderCountLabel
                            ]}>
                              {data.orderCount === 1 ? 'pedido' : 'pedidos'}
                            </Text>
                            {isHighest && data.orderCount > 0 && (
                              <MaterialIcons name="trending-up" size={16} color="#FF4B2B" />
                            )}
                          </View>
                        </View>
                          {/* Barra visual para mostrar proporção */}
                        <View style={pontoModalStyles.progressBarContainer}>
                          <View 
                            style={[
                              pontoModalStyles.progressBar,
                              {
                                width: `${getMaxOrderCount() > 0 ? (data.orderCount / getMaxOrderCount()) * 100 : 0}%`,
                                backgroundColor: isHighest ? '#FF4B2B' : getIntensityColor(data.orderCount, getMaxOrderCount())
                              }
                            ]} 
                          />
                        </View>
                      </View>
                    );
                  })}
                </>
              ) : (
                <View style={pontoModalStyles.emptyState}>
                  <MaterialIcons name="timeline" size={48} color="#ccc" />
                  <Text style={pontoModalStyles.emptyText}>
                    Nenhum dado encontrado para esta data
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default PicoModal;
