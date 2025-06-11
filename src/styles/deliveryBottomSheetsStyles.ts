import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default StyleSheet.create({
  // Estilos base do Bottom Sheet
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
  bottomSheetContent: {
    flex: 1,
    padding: 20,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 20,
    textAlign: 'center',
  },
  bottomSheetSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },

  // Estilos para lista de motos
  motorcycleItem: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedMotorcycleItem: {
    borderColor: '#e41c26',
    backgroundColor: '#FFF5F5',
  },
  motorcyclePlate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
  },

  // Estilos para lista de pedidos
  orderItem: {
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderWidth: 0, // Removido a borda
    marginBottom: 0, // Removido a margem vertical para integrar com o swipe container
    shadowOpacity: 0, // Removidas as sombras do item para usar apenas as do container
    shadowRadius: 0,
    elevation: 0,
  },
  selectedOrderItem: {
    borderColor: '#e41c26',
    backgroundColor: '#FFF5F5',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  orderAddress: {
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 8,
    lineHeight: 22,
  },
  orderItems: {
    fontSize: 14,
    color: '#718096',
    fontStyle: 'italic',
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    flex: 1,
  },
  orderIdSmall: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'right',
  },
  orderItemsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTime: {
    fontSize: 12,
    color: '#718096',
    fontStyle: 'italic',
    textAlign: 'right',
  },

  // Estilos para botões
  confirmButton: {
    backgroundColor: '#e41c26',
    borderRadius: 12,
    padding: 16,
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
    marginTop: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#CBD5E0',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Estilos adicionais para o FinishDeliveryBottomSheet
  finishOrderItem: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e41c26',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
  },
  statusText: {
    color: '#e41c26',
    fontSize: 12,
    fontWeight: '500',
  },

  // Estilos de feedback visual
  itemPressable: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginTop: 8,
  },

  // Estilos do contador de seleção
  selectionCounter: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#e41c26',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  selectionCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Estilos para animações de carregamento
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
  },
  loadingOrderItem: {
    opacity: 0.7,
  },
  canceledOrderItem: {
    backgroundColor: '#FEE2E2',
    opacity: 0.8,
    borderColor: '#DC2626',
  },
  canceledText: {
    color: '#6B7280',
  },
  orderHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  canceledBadge: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 12,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  globalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  globalLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
  },

  // Estilos para a barra de pesquisa
  searchContainer: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
    marginLeft: 8,
    padding: 0,
  },
  searchIcon: {
    color: '#718096',
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    color: '#718096',
  },
  // Estilos para o botão de refresh
  refreshButton: {
    padding: 4,
    marginLeft: 8,
  },
  refreshIcon: {
    color: '#4299E1',
  },
  refreshingIcon: {
    opacity: 0.5,
  },
  refreshSuccessIcon: {
    color: '#48BB78', // Verde para indicar sucesso
  },
  refreshingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    flex: 1,
  },
  refreshingText: {
    fontSize: 16,
    color: '#4299E1',
    marginTop: 16,
    textAlign: 'center',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  // Add these styles to your existing styles object
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  emergencyCloseButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
  },

  closeButtonText: {
    color: '#FF4B2B',
    fontWeight: '600',
  },

  // Estilos para ações de swipe
  swipeContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden', // Garante que as ações de swipe sigam o mesmo arredondamento
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  swipeActionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: '100%',
  },
  completeActionContainer: {
    backgroundColor: '#48BB78', // Verde
  },
  cancelActionContainer: {
    backgroundColor: '#E53E3E', // Vermelho
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  swipeActionIcon: {
    marginBottom: 4,
  },

  // Estilos para as instruções no rodapé
  instructionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    fontSize: 14,
    marginVertical: 3,
    fontWeight: '500',
  },
  instructionArrow: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  finishArrow: {
    color: '#48BB78', // Verde
  },
  cancelArrow: {
    color: '#E53E3E', // Vermelho
  },
  finishText: {
    color: '#48BB78', // Verde
  },
  cancelText: {
    color: '#E53E3E', // Vermelho
  },

  // Estilos para os modais de confirmação
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#2D3748',
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: '#4A5568',
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#48BB78', // Verde
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  modalCancelButton: {
    backgroundColor: '#E53E3E', // Vermelho
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});