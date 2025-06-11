// src/components/FolhaPontoModal.tsx
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
import { getFolhaPontoDataForUnit, FolhaPontoData } from '../hooks/useStatsData';
import pontoModalStyles from '../styles/pontoModalStyles';

interface FolhaPontoModalProps {
  visible: boolean;
  onClose: () => void;
  unitId?: string; // ID da unidade para buscar os dados
  unitName?: string; // Nome da unidade (opcional)
}

const FolhaPontoModal: React.FC<FolhaPontoModalProps> = ({ visible, onClose, unitId, unitName }) => {
  const [folhaPontoData, setFolhaPontoData] = useState<FolhaPontoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Função para buscar os dados de folha de ponto da unidade
  const fetchFolhaPontoData = async (date: string) => {
    if (!unitId) {
      Alert.alert('Erro', 'ID da unidade não fornecido');
      return;
    }

    setLoading(true);
    try {
      const folhaPonto = await getFolhaPontoDataForUnit(unitId, date);
      setFolhaPontoData(folhaPonto);
    } catch (error) {
      console.error('Erro ao buscar dados de folha de ponto:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados de folha de ponto');
    } finally {
      setLoading(false);
    }
  };

  // Buscar dados quando o modal abrir ou a data mudar
  useEffect(() => {
    if (visible && unitId) {
      fetchFolhaPontoData(selectedDate);
    }
  }, [visible, selectedDate, unitId]);

  // Função para mudança de data
  const handleDateChange = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  // Função para formatar horário
  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  // Função para formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Função para formatar timestamp do Firebase
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '--:--';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '--:--';
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
        <View style={pontoModalStyles.header}>
          <TouchableOpacity onPress={onClose} style={pontoModalStyles.closeButton}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={pontoModalStyles.title}>Folha de Ponto</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <MaterialIcons name="business" size={16} color="#FF4B2B" />
              <Text style={[pontoModalStyles.unitText, { fontSize: 14, color: '#666' }]}>
                {unitId || 'ID não identificado'}
              </Text>
            </View>
          </View>
          <View style={pontoModalStyles.placeholder} />
        </View>

        <View style={pontoModalStyles.dateNavigation}>
          <TouchableOpacity
            onPress={() => handleDateChange('prev')}
            style={pontoModalStyles.dateNavButton}
          >
            <MaterialIcons name="chevron-left" size={24} color="#FF4B2B" />
          </TouchableOpacity>
          
          <Text style={pontoModalStyles.dateText}>
            {formatDate(selectedDate)}
          </Text>
          
          <TouchableOpacity
            onPress={() => handleDateChange('next')}
            style={pontoModalStyles.dateNavButton}
          >
            <MaterialIcons name="chevron-right" size={24} color="#FF4B2B" />
          </TouchableOpacity>
        </View>          
        <ScrollView style={pontoModalStyles.content}>
          {loading ? (
            <View style={pontoModalStyles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF4B2B" />
              <Text style={pontoModalStyles.loadingText}>Carregando folha de ponto...</Text>
            </View>
          ) : folhaPontoData ? (
            <>
              {/* Resumo da Unidade */}
              <View style={pontoModalStyles.summaryCard}>
                <Text style={pontoModalStyles.summaryTitle}>Resumo da Unidade</Text>
                <Text style={pontoModalStyles.summaryDate}>
                  {formatDate(selectedDate)}
                </Text>

                <View style={pontoModalStyles.unitInfo}>
                  <MaterialIcons name="group" size={16} color="#FF4B2B" />
                  <Text style={pontoModalStyles.unitText}>
                    Funcionários Ativos: {folhaPontoData.activeEmployees} de {folhaPontoData.employees.length}
                  </Text>
                </View>

                <View style={pontoModalStyles.unitInfo}>
                  <MaterialIcons name="schedule" size={16} color="#FF4B2B" />
                  <Text style={pontoModalStyles.unitText}>
                    Total de Horas Trabalhadas: {folhaPontoData.totalUnitHours}h
                  </Text>
                </View>
              </View>

              {/* Lista de Funcionários */}
              {folhaPontoData.employees.map((employee) => (
                <View key={employee.id} style={pontoModalStyles.summaryCard}>
                  <Text style={pontoModalStyles.summaryTitle}>{employee.name}</Text>
                  
                  {employee.pontoData ? (
                    <>                      
                    {/* Registros de Entrada/Saída */}
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((index) => {
                        const entradaKey = `Entrada${index}`;
                        const saidaKey = `Saida${index}`;
                        const motorcycleKey = `motorcycleEntrada${index}`;
                        const entrada = employee.pontoData![entradaKey];
                        const saida = employee.pontoData![saidaKey];
                        const motorcycleId = employee.pontoData![motorcycleKey];
                        
                        if (!entrada && !saida) return null;
                        
                        return (
                          <View key={index} style={pontoModalStyles.pontoLine}>
                            <View style={pontoModalStyles.pontoTimes}>
                              <View style={pontoModalStyles.timeEntry}>
                                <MaterialIcons name="login" size={16} color="#4CAF50" />
                                <Text style={pontoModalStyles.timeLabel}>Entrada {index}:</Text>
                                <Text style={pontoModalStyles.timeValue}>
                                  {formatTimestamp(entrada)}
                                </Text>
                              </View>

                              <View style={pontoModalStyles.timeEntry}>
                                <MaterialIcons name="logout" size={16} color="#f44336" />
                                <Text style={pontoModalStyles.timeLabel}>Saída {index}:</Text>
                                <Text style={pontoModalStyles.timeValue}>
                                  {formatTimestamp(saida)}
                                </Text>
                              </View>
                            </View>                            
                            {motorcycleId && (
                              <View style={pontoModalStyles.unitInfo}>
                                <MaterialIcons name="motorcycle" size={16} color="#FF4B2B" />
                                <Text style={pontoModalStyles.unitText}>
                                  Motocicleta: {motorcycleId}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}

                      {/* Total de horas do funcionário */}
                      {employee.totalHours && (
                        <View style={pontoModalStyles.unitInfo}>
                          <MaterialIcons name="schedule" size={16} color="#FF4B2B" />
                          <Text style={pontoModalStyles.unitText}>
                            Total de Horas: {employee.totalHours}h
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={pontoModalStyles.unitInfo}>
                      <MaterialIcons name="info" size={16} color="#999" />
                      <Text style={[pontoModalStyles.unitText, { color: '#999' }]}>
                        Nenhum registro de ponto para este dia
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          ) : (
            <View style={pontoModalStyles.noRecordsContainer}>
              <MaterialIcons name="schedule" size={48} color="#ccc" />
              <Text style={pontoModalStyles.noRecordsText}>
                Nenhum registro de ponto encontrado para esta data
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default FolhaPontoModal;
