// src/components/PontoModal.tsx
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
import { getPontoDataForDeliveryman, Ponto } from '../hooks/useStatsData';
import pontoModalStyles from '../styles/pontoModalStyles';

interface PontoModalProps {
  visible: boolean;
  onClose: () => void;
  deliverymanId?: string; // ID do entregador para buscar os dados
  deliverymanName?: string; // Nome do entregador (opcional)
}

const PontoModal: React.FC<PontoModalProps> = ({ visible, onClose, deliverymanId, deliverymanName }) => {
  const [pontoData, setPontoData] = useState<Ponto | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  // Função para buscar os dados de ponto
  const fetchPontoData = async (date: string) => {
    if (!deliverymanId) {
      Alert.alert('Erro', 'ID do entregador não fornecido');
      return;
    }

    setLoading(true);
    try {
      const ponto = await getPontoDataForDeliveryman(deliverymanId, date);
      setPontoData(ponto);
    } catch (error) {
      console.error('Erro ao buscar dados de ponto:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados de ponto');
    } finally {
      setLoading(false);
    }
  };
  // Buscar dados quando o modal abrir ou a data mudar
  useEffect(() => {
    if (visible && deliverymanId) {
      fetchPontoData(selectedDate);
    }
  }, [visible, selectedDate, deliverymanId]);

  // Função para buscar nome da unidade
  const getUnitName = async (unitId: string): Promise<string> => {
    try {
      // Aqui você pode implementar a busca do nome da unidade
      // Por enquanto, retornamos o ID
      return unitId;
    } catch (error) {
      console.error('Erro ao buscar nome da unidade:', error);
      return unitId;
    }
  };

  // Função para formatar timestamp
  const formatTime = (timestamp: any): string => {
    if (!timestamp) return '--:--';
    
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return '--:--';
    }

    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  // Renderizar uma linha de entrada/saída
  const renderPontoLine = (
    entradaKey: string,
    saidaKey: string,
    unitKey: string,
    index: number
  ) => {
    const entrada = pontoData?.[entradaKey];
    const saida = pontoData?.[saidaKey];
    const unitId = pontoData?.[unitKey];
    const motorcycleKey = `motorcycleEntrada${index}`;
    const motorcycleId = pontoData?.[motorcycleKey];

    return (
      <View key={index} style={pontoModalStyles.pontoLine}>
        <View style={pontoModalStyles.pontoSequence}>
          <Text style={pontoModalStyles.pontoSequenceText}>{index}</Text>
        </View>
        
        <View style={pontoModalStyles.pontoTimes}>
          <View style={pontoModalStyles.timeEntry}>
            <MaterialIcons name="login" size={16} color="#4CAF50" />
            <Text style={pontoModalStyles.timeLabel}>Entrada:</Text>
            <Text style={pontoModalStyles.timeValue}>
              {formatTime(entrada)}
            </Text>
          </View>
          
          <View style={pontoModalStyles.timeEntry}>
            <MaterialIcons name="logout" size={16} color="#F44336" />
            <Text style={pontoModalStyles.timeLabel}>Saída:</Text>
            <Text style={pontoModalStyles.timeValue}>
              {formatTime(saida)}
            </Text>
          </View>
        </View>

        {unitId && (
          <View style={pontoModalStyles.unitInfo}>
            <MaterialIcons name="location-on" size={14} color="#666" />
            <Text style={pontoModalStyles.unitText}>Unidade: {unitId}</Text>
          </View>
        )}

        {motorcycleId && (
          <View style={pontoModalStyles.unitInfo}>
            <MaterialIcons name="motorcycle" size={14} color="#FF4B2B" />
            <Text style={pontoModalStyles.unitText}>Motocicleta: {motorcycleId}</Text>
          </View>
        )}
      </View>
    );
  };

  // Função para mudar a data
  const changeDate = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
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
            Registro de Ponto{deliverymanName ? ` - ${deliverymanName}` : ''}
          </Text>
          <View style={pontoModalStyles.placeholder} />
        </View>

        {/* Date Navigation */}
        <View style={pontoModalStyles.dateNavigation}>
          <TouchableOpacity 
            onPress={() => changeDate(-1)} 
            style={pontoModalStyles.dateNavButton}
          >
            <MaterialIcons name="chevron-left" size={24} color="#FF4B2B" />
          </TouchableOpacity>
          
          <Text style={pontoModalStyles.dateText}>
            {new Date(selectedDate).toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
          
          <TouchableOpacity 
            onPress={() => changeDate(1)} 
            style={pontoModalStyles.dateNavButton}
            disabled={selectedDate >= new Date().toISOString().split('T')[0]}
          >
            <MaterialIcons 
              name="chevron-right" 
              size={24} 
              color={selectedDate >= new Date().toISOString().split('T')[0] ? "#ccc" : "#FF4B2B"} 
            />          
        </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={pontoModalStyles.content}>
          {!deliverymanId ? (
            <View style={pontoModalStyles.noRecordsContainer}>
              <MaterialIcons name="error-outline" size={48} color="#ccc" />
              <Text style={pontoModalStyles.noRecordsText}>
                Nenhum entregador selecionado
              </Text>
            </View>
          ) : loading ? (
            <View style={pontoModalStyles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF4B2B" />
              <Text style={pontoModalStyles.loadingText}>Carregando registros...</Text>
            </View>
          ) : pontoData ? (
            <View style={pontoModalStyles.pontoContainer}>
              <View style={pontoModalStyles.summaryCard}>
                <Text style={pontoModalStyles.summaryTitle}>Resumo do Dia</Text>
                <Text style={pontoModalStyles.summaryDate}>
                  {new Date(selectedDate).toLocaleDateString('pt-BR')}
                </Text>
              </View>

              {/* Render all entrada/saida pairs */}
              {Array.from({ length: 10 }, (_, i) => i + 1).map(sequence => {
                const entradaKey = `Entrada${sequence}`;
                const saidaKey = `Saida${sequence}`;
                const unitKey = `unitEntrada${sequence}`;
                
                // Only render if entrada exists
                if (pontoData[entradaKey]) {
                  return renderPontoLine(entradaKey, saidaKey, unitKey, sequence);
                }
                return null;
              })}

              {/* Show message if no records */}
              {!Object.keys(pontoData).some(key => key.startsWith('Entrada')) && (
                <View style={pontoModalStyles.noRecordsContainer}>
                  <MaterialIcons name="schedule" size={48} color="#ccc" />
                  <Text style={pontoModalStyles.noRecordsText}>
                    Nenhum registro de ponto encontrado para esta data
                  </Text>
                </View>
              )}
            </View>
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

export default PontoModal;
