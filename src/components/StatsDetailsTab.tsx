import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BarChart, LineChart } from 'react-native-chart-kit';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { DateFilterPicker, DateFilterType } from './DateFilterPicker';
import styles from '../styles/statsScreenStyles';
import { DetailedStats } from '../utils/statsUtils';

interface StatsDetailsTabProps {
  detailedStats: DetailedStats[];
  type: 'unit' | 'deliveryman';
  userRole?: string;
  onDateFilterChange?: (start: Date, end: Date) => void;
  currentDateFilter?: {
    startDate: Date;
    endDate: Date;
  };
}

export const StatsDetailsTab: React.FC<StatsDetailsTabProps> = ({
  detailedStats,
  type,
  userRole,
  onDateFilterChange,
  currentDateFilter
}) => {
  const [selectedFilter, setSelectedFilter] = useState<DateFilterType>('monthly');
  const [isExporting, setIsExporting] = useState(false);
  const [combinedStats, setCombinedStats] = useState<DetailedStats | null>(null);

  const defaultDateFilter = {
    startDate: new Date(new Date().setDate(1)),
    endDate: new Date()
  };

  useEffect(() => {
    if (detailedStats && detailedStats.length > 0) {      const combined = detailedStats.reduce((acc, curr) => {
        return {
          name: 'Estatísticas Combinadas',
          totalDeliveries: (acc.totalDeliveries || 0) + curr.totalDeliveries,
          totalRevenue: (acc.totalRevenue || 0) + curr.totalRevenue,
          averageDeliveryTime: (acc.averageDeliveryTime || 0) + curr.averageDeliveryTime / detailedStats.length,
          fastestDelivery: acc.fastestDelivery === 0 ? curr.fastestDelivery : 
            Math.min(acc.fastestDelivery || Infinity, curr.fastestDelivery),
          slowestDelivery: Math.max(acc.slowestDelivery || 0, curr.slowestDelivery || 0),
          averageRating: 0,
          totalRatings: (acc.totalRatings || 0) + curr.totalRatings,
          ratingDistribution: {},
          recentReviews: [],
          performanceByDay: Object.entries(curr.performanceByDay).reduce((dayAcc, [day, count]) => ({
            ...dayAcc,
            [parseInt(day)]: (dayAcc[parseInt(day)] || 0) + count
          }), acc.performanceByDay || {}),
          topItems: mergeAndSortArrays(acc.topItems || [], curr.topItems || [], 5),
          topCustomers: mergeAndSortArrays(acc.topCustomers || [], curr.topCustomers || [], 5),
          revenueTrend: acc.revenueTrend ? acc.revenueTrend.map((item: any, index: number) => ({
            date: item.date,
            revenue: item.revenue + (curr.revenueTrend[index]?.revenue || 0)
          })) : curr.revenueTrend,
          totalDistance: (acc.totalDistance || 0) + curr.totalDistance,
          topDeliverymen: mergeAndSortDeliverymen(acc.topDeliverymen || [], curr.topDeliverymen || [], 3),
          topMotorcycles: mergeAndSortArrays(acc.topMotorcycles || [], curr.topMotorcycles || [], 5),
          topRegions: type === 'unit' ? mergeAndSortArrays(acc.topRegions || [], curr.topRegions || [], 10) : undefined,
          deliveryTimeDistribution: {},
          ordersByHour: {},
          customerSatisfaction: {
            total: 0,
            satisfied: 0,
            percentage: 0
          }
        };
      }, {} as DetailedStats);

      setCombinedStats(combined);
    }
  }, [detailedStats]);

  const mergeAndSortArrays = (arr1: [string, number][], arr2: [string, number][], limit: number): [string, number][] => {
    const merged = new Map<string, number>();
    
    [...arr1, ...arr2].forEach(([key, value]) => {
      merged.set(key, (merged.get(key) || 0) + value);
    });

    return Array.from(merged.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);
  };

  const mergeAndSortDeliverymen = (
    arr1: Array<{ name: string; deliveries: number; averageRating: number }>,
    arr2: Array<{ name: string; deliveries: number; averageRating: number }>,
    limit: number
  ) => {
    const merged = new Map<string, { deliveries: number; ratings: number; count: number }>();
    
    [...arr1, ...arr2].forEach(({ name, deliveries, averageRating }) => {
      const current = merged.get(name) || { deliveries: 0, ratings: 0, count: 0 };
      merged.set(name, {
        deliveries: current.deliveries + deliveries,
        ratings: current.ratings + (averageRating * deliveries),
        count: current.count + deliveries
      });
    });

    return Array.from(merged.entries())
      .map(([name, { deliveries, ratings, count }]) => ({
        name,
        deliveries,
        averageRating: ratings / count
      }))
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, limit);
  };

  const handleFilterChange = (filter: DateFilterType) => {
    setSelectedFilter(filter);
  };

  const handleDateChange = (start: Date, end: Date) => {
    onDateFilterChange?.(start, end);
  };

  const generateHTML = (stats: DetailedStats) => {
    const period = `${currentDateFilter?.startDate.toLocaleDateString('pt-BR')} até ${currentDateFilter?.endDate.toLocaleDateString('pt-BR')}`;
    
    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .section-title { color: #FF4B2B; font-size: 18px; margin-bottom: 10px; }
            .stat-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .stat-item { text-align: center; }
            .list-item { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Estatísticas</h1>
            <p>Período: ${period}</p>
          </div>

          <div class="section">
            <h2 class="section-title">Resumo Geral</h2>
            <p>Entregas Totais: ${stats.totalDeliveries}</p>
            ${userRole !== 'deliv' ? `<p>Receita Total: R$ ${stats.totalRevenue.toFixed(2)}</p>` : ''}
            <p>Tempo Médio de Entrega: ${stats.averageDeliveryTime.toFixed(0)} min</p>
            <p>Entrega Mais Rápida: ${stats.fastestDelivery.toFixed(0)} min</p>
          </div>

          <div class="section">
            <h2 class="section-title">Top 3 Entregadores</h2>
            ${stats.topDeliverymen?.map(d => 
              `<p>${d.name}: ${d.deliveries} entregas</p>`
            ).join('')}
          </div>

          <div class="section">
            <h2 class="section-title">Itens Mais Vendidos</h2>
            ${stats.topItems.map(([item, count]) => 
              `<p class="list-item">${item}: ${count} vendas</p>`
            ).join('')}
          </div>

          <div class="section">
            <h2 class="section-title">Clientes Mais Frequentes</h2>
            ${stats.topCustomers.map(([customer, count]) => 
              `<p class="list-item">${customer}: ${count} compras</p>`
            ).join('')}
          </div>          <div class="section">
            <h2 class="section-title">Motos Mais Utilizadas</h2>
            ${stats.topMotorcycles.map(([plate, count]) => 
              `<p class="list-item">${plate}: ${count} entregas</p>`
            ).join('')}
          </div>

          ${type === 'unit' && stats.topRegions && stats.topRegions.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Top 10 Regiões</h2>
            ${stats.topRegions.map(([region, count]) => 
              `<p class="list-item">${region}: ${count} entregas</p>`
            ).join('')}
          </div>
          ` : ''}

          <div class="section">
            <h2 class="section-title">Distância Total</h2>
            <p>Distância Total Percorrida: ${stats.totalDistance.toFixed(1)} km</p>
          </div>
        </body>
      </html>
    `;
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      console.log('Starting PDF export...');

      if (!combinedStats) {
        throw new Error('Não há dados para exportar');
      }

      console.log('Generating PDF...');
      const html = generateHTML(combinedStats);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });

      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (!permissions.granted) {
          Alert.alert(
            'Permissão Necessária',
            'Precisamos de acesso ao armazenamento para salvar o PDF.',
            [{ text: 'OK' }]
          );
          return;
        }

        try {
          const fileName = `Estatisticas_${new Date().toISOString().split('T')[0]}.pdf`;
          
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const dirUri = permissions.directoryUri;
          await FileSystem.StorageAccessFramework.createFileAsync(
            dirUri,
            fileName,
            'application/pdf'
          ).then(async (fileUri) => {
            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            Alert.alert(
              'Sucesso',
              'PDF salvo com sucesso!',
              [{ text: 'OK' }]
            );
          });

        } catch (error) {
          console.error('Error saving file:', error);
          Alert.alert(
            'Erro',
            'Não foi possível salvar o PDF. Por favor, tente novamente.',
            [{ text: 'OK' }]
          );
        }
      } else {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: 'Salvar PDF'
        });
      }    } catch (error) {
      console.error('Error in PDF export:', error);
      Alert.alert(
        'Erro',
        'Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      console.log('Starting Excel export...');

      if (!combinedStats) {
        throw new Error('Não há dados para exportar');
      }

      // Criar dados para as planilhas
      const period = `${currentDateFilter?.startDate.toLocaleDateString('pt-BR')} até ${currentDateFilter?.endDate.toLocaleDateString('pt-BR')}`;
      
      // Planilha 1: Resumo Geral
      const resumoData = [
        ['RELATÓRIO DE ESTATÍSTICAS'],
        [`Período: ${period}`],
        [''],
        ['RESUMO GERAL'],
        ['Métrica', 'Valor'],
        ['Entregas Totais', combinedStats.totalDeliveries],
        ['Receita Total', userRole !== 'deliv' ? `R$ ${combinedStats.totalRevenue.toFixed(2)}` : 'N/A'],
        ['Tempo Médio de Entrega (min)', combinedStats.averageDeliveryTime.toFixed(0)],
        ['Entrega Mais Rápida (min)', combinedStats.fastestDelivery.toFixed(0)],
        ['Entrega Mais Lenta (min)', combinedStats.slowestDelivery.toFixed(0)],
        ['Distância Total (km)', (combinedStats.totalDistance / 1000).toFixed(1)],
      ];

      // Planilha 2: Itens Mais Vendidos
      const itensData = [
        ['ITENS MAIS VENDIDOS'],
        ['Item', 'Quantidade'],
        ...combinedStats.topItems.map(([item, count]) => [item, count])
      ];

      // Planilha 3: Clientes Mais Frequentes  
      const clientesData = [
        ['CLIENTES MAIS FREQUENTES'],
        ['Cliente', 'Pedidos'],
        ...combinedStats.topCustomers.map(([customer, count]) => [customer, count])
      ];

      // Planilha 4: Motos Mais Utilizadas
      const motosData = [
        ['MOTOS MAIS UTILIZADAS'],
        ['Placa', 'Entregas'],
        ...combinedStats.topMotorcycles.map(([plate, count]) => [plate, count])
      ];

      // Planilha 5: Desempenho por Dia da Semana
      const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const performanceData = [
        ['DESEMPENHO POR DIA DA SEMANA'],
        ['Dia', 'Entregas'],
        ...diasSemana.map((dia, index) => [dia, combinedStats.performanceByDay[index] || 0])
      ];

      // Planilha 6: Top Entregadores (se for unidade)
      let entregadoresData: any[] = [];
      if (type === 'unit' && combinedStats.topDeliverymen) {
        entregadoresData = [
          ['TOP ENTREGADORES'],
          ['Nome', 'Entregas', 'Avaliação Média'],
          ...combinedStats.topDeliverymen.map(deliveryman => [
            deliveryman.name.split(' ').slice(0, 2).join(' '),
            deliveryman.deliveries,
            deliveryman.averageRating.toFixed(1)
          ])
        ];
      }

      // Planilha 7: Top Regiões (se for unidade)
      let regioesData: any[] = [];
      if (type === 'unit' && combinedStats.topRegions && combinedStats.topRegions.length > 0) {
        regioesData = [
          ['TOP 10 REGIÕES'],
          ['Região', 'Entregas'],
          ...combinedStats.topRegions.map(([region, count]) => [region, count])
        ];
      }

      // Planilha 8: Tendência de Receita (se não for entregador)
      let receitaData: any[] = [];
      if (userRole !== 'deliv' && combinedStats.revenueTrend) {
        receitaData = [
          ['TENDÊNCIA DE RECEITA (ÚLTIMOS 7 DIAS)'],
          ['Data', 'Receita (R$)'],
          ...combinedStats.revenueTrend.map(item => [
            new Date(item.date).toLocaleDateString('pt-BR'),
            item.revenue.toFixed(2)
          ])
        ];
      }

      // Criar workbook
      const wb = XLSX.utils.book_new();

      // Adicionar planilhas
      const ws1 = XLSX.utils.aoa_to_sheet(resumoData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Resumo Geral');

      const ws2 = XLSX.utils.aoa_to_sheet(itensData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Itens Mais Vendidos');

      const ws3 = XLSX.utils.aoa_to_sheet(clientesData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Clientes Frequentes');

      const ws4 = XLSX.utils.aoa_to_sheet(motosData);
      XLSX.utils.book_append_sheet(wb, ws4, 'Motos Utilizadas');

      const ws5 = XLSX.utils.aoa_to_sheet(performanceData);
      XLSX.utils.book_append_sheet(wb, ws5, 'Performance Semanal');

      if (entregadoresData.length > 0) {
        const ws6 = XLSX.utils.aoa_to_sheet(entregadoresData);
        XLSX.utils.book_append_sheet(wb, ws6, 'Top Entregadores');
      }

      if (regioesData.length > 0) {
        const ws7 = XLSX.utils.aoa_to_sheet(regioesData);
        XLSX.utils.book_append_sheet(wb, ws7, 'Top Regiões');
      }

      if (receitaData.length > 0) {
        const ws8 = XLSX.utils.aoa_to_sheet(receitaData);
        XLSX.utils.book_append_sheet(wb, ws8, 'Tendência Receita');
      }

      // Gerar arquivo Excel
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileName = `Estatisticas_${new Date().toISOString().split('T')[0]}.xlsx`;

      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (!permissions.granted) {
          Alert.alert(
            'Permissão Necessária',
            'Precisamos de acesso ao armazenamento para salvar o arquivo Excel.',
            [{ text: 'OK' }]
          );
          return;
        }

        try {
          const dirUri = permissions.directoryUri;
          const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            dirUri,
            fileName,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          );
          
          await FileSystem.writeAsStringAsync(fileUri, wbout, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          Alert.alert(
            'Sucesso',
            'Arquivo Excel salvo com sucesso!',
            [{ text: 'OK' }]
          );

        } catch (error) {
          console.error('Error saving Excel file:', error);
          Alert.alert(
            'Erro',
            'Não foi possível salvar o arquivo Excel. Por favor, tente novamente.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // iOS - salvar arquivo temporário e compartilhar
        const tempUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(tempUri, wbout, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        await Sharing.shareAsync(tempUri, {
          UTI: 'org.openxmlformats.spreadsheetml.sheet',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Salvar arquivo Excel'
        });
      }

    } catch (error) {
      console.error('Error in Excel export:', error);
      Alert.alert(
        'Erro',
        'Ocorreu um erro ao gerar o arquivo Excel. Por favor, tente novamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (!combinedStats) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Carregando estatísticas...</Text>
      </View>
    );
  }

  return (
    <View>
      <DateFilterPicker
        selectedFilter={selectedFilter}
        currentDateFilter={currentDateFilter || defaultDateFilter}
        onFilterChange={handleFilterChange}
        onDateChange={handleDateChange}
      />

      <View style={styles.detailedCard}>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <MaterialIcons name="local-shipping" size={24} color="#FF4B2B" />
            <Text style={styles.statValue}>{combinedStats.totalDeliveries}</Text>
            <Text style={styles.statLabel}>Entregas Totais</Text>
          </View>
          {userRole !== 'deliv' && (
            <View style={styles.statItem}>
              <MaterialIcons name="attach-money" size={24} color="#FF4B2B" />
              <Text style={styles.statValue}>R$ {combinedStats.totalRevenue.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Receita Total</Text>
            </View>
          )}
        </View>

        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <MaterialIcons name="access-time" size={24} color="#FF4B2B" />
            <Text style={styles.statValue}>{combinedStats.averageDeliveryTime.toFixed(0)} min</Text>
            <Text style={styles.statLabel}>Tempo Médio de Entrega</Text>        
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="speed" size={24} color="#FF4B2B" />
            <Text style={styles.statValue}>{combinedStats.fastestDelivery.toFixed(0)} min</Text>
            <Text style={styles.statLabel}>Entrega Mais Rápida</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Desempenho por Dia da Semana</Text>        
        <BarChart
          data={{
            labels: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
            datasets: [{
              data: [0, 1, 2, 3, 4, 5, 6].map(day => combinedStats.performanceByDay[day] || 0)
            }]
          }}
          width={300}
          height={200}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 75, 43, ${opacity})`,
          }}
          style={styles.chart}
        />

        {userRole !== 'deliv' && (
          <>
            <Text style={styles.sectionTitle}>Tendência de Receita (Últimos 7 dias)</Text>
            <LineChart
              data={{
                labels: combinedStats.revenueTrend.map(d => d.date.split('-')[2]),
                datasets: [{
                  data: combinedStats.revenueTrend.map(d => d.revenue)
                }]
              }}
              width={300}
              height={200}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 2,
                color: (opacity = 1) => `rgba(255, 75, 43, ${opacity})`,
              }}
              style={styles.chart}
            />
          </>
        )}

        {type === 'unit' && combinedStats.topRegions && combinedStats.topRegions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Top 10 Regiões</Text>
            {combinedStats.topRegions.map(([region, count], i) => (
              <Text key={i} style={styles.listItem}>{region}: {count} {count > 1 ? 'entregas' : 'entrega' }</Text>
            ))}
          </>
        )}

        {type === 'unit' && combinedStats.topDeliverymen && (
          <View style={styles.topDeliverymenContainer}>
            <Text style={styles.sectionTitle}>Top 3 Entregadores</Text>
            {combinedStats.topDeliverymen.map((deliveryman, idx) => (
              <View key={idx} style={styles.topDeliverymanInfo}>
                <MaterialIcons name="person" size={24} color="#FF4B2B" />
                <Text style={styles.topDeliverymanName}>{deliveryman.name.split(' ').slice(0, 2).join(' ')}</Text>
                <Text style={styles.topDeliverymanDeliveries}>
                  {deliveryman.deliveries} {deliveryman.deliveries > 1 ? 'entregas' : 'entrega' }
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Itens Mais Vendidos</Text>
        {combinedStats.topItems.map(([item, count], i) => (
          <Text key={i} style={styles.listItem}>{item}: {count} {count > 1 ? 'vendas' : 'venda' }</Text>
        ))}

        <Text style={styles.sectionTitle}>Clientes Mais Frequentes</Text>
        {combinedStats.topCustomers.map(([customer, count], i) => (
          <Text key={i} style={styles.listItem}>{customer}: {count} {count > 1 ? 'compras' : 'compra' }</Text>
        ))}

        <Text style={styles.sectionTitle}>Motos Mais Utilizadas</Text>
        {combinedStats.topMotorcycles.map(([plate, count], i) => (
          <Text key={i} style={styles.listItem}>{plate}: {count} {count > 1 ? 'entregas' : 'entrega' }</Text>
        ))}

        <Text style={styles.sectionTitle}>Distância Total Percorrida</Text>
        <Text style={styles.statValue}>{(combinedStats.totalDistance / 1000).toFixed(1)} km</Text>      
        </View>
      
      {userRole !== 'deliv' && (
        <View>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportPDF}
            disabled={isExporting}
          >
            <MaterialIcons name="picture-as-pdf" size={24} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>
              {isExporting ? 'Exportando...' : 'Exportar para PDF'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: '#28a745', marginTop: 10 }]}
            onPress={handleExportExcel}
            disabled={isExporting}
          >
            <MaterialIcons name="table-chart" size={24} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>
              {isExporting ? 'Exportando...' : 'Exportar para Excel'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default StatsDetailsTab;