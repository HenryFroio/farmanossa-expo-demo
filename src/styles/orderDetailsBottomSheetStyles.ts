import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

// Cores unificadas para manter consistência
const colors = {
  primary: '#e41c26',
  background: '#FFFFFF',
  backgroundLight: '#F7FAFC',
  backgroundDanger: '#FEF2F2',
  backgroundSuccess: '#ECFDF5',
  text: '#2D3748',
  textLight: '#4A5568',
  textLighter: '#718096', 
  textDanger: '#991B1B',
  textDangerLight: '#7F1D1D',
  textSuccess: '#059669',
  border: '#E2E8F0',
  borderDanger: '#DC2626',
  borderSuccess: '#059669',
  accent: '#e41c26',
  dot: '#e41c26',
  star: '#FFD700'
};

// Font sizes - increased for better readability
const fontSize = {
  title: isTablet ? 32 : 24,
  sectionTitle: isTablet ? 20 : 18,
  normal: isTablet ? 18 : 16,
  small: isTablet ? 16 : 14,
};

export default StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: colors.background,
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
    padding: isTablet ? 30 : 20,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isTablet ? 28 : 20,
    paddingBottom: isTablet ? 16 : 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bottomSheetTitle: {
    fontSize: fontSize.title,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.backgroundLight,
  },
  statusEmAndamento: {
    backgroundColor: '#FFF5F5',
  },
  statusEntregue: {
    backgroundColor: '#F0FFF4',
  },
  statusACaminho: {
    backgroundColor: '#FEFCBF',
  },
  statusPendente: {
    backgroundColor: colors.backgroundLight,
  },
  statusText: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.text,
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  
  // Estilos uniformes para linhas de informação
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isTablet ? 14 : 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRowAddress: {
    paddingVertical: isTablet ? 14 : 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIconContainer: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  infoLabel: {
    fontSize: fontSize.normal,
    color: colors.textLight,
    fontWeight: '500',
    width: 90,
  },
  infoValue: {
    fontSize: fontSize.normal,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  addressText: {
    fontSize: fontSize.normal,
    color: colors.text,
    marginLeft: 32,
    lineHeight: 22,
  },
  
  // Estilos para seções
  sectionContainer: {
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  
  // Estilo para cards de informação
  infoCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  infoCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}80`, // mais transparente
  },
  infoCardLabel: {
    fontSize: fontSize.normal,
    color: colors.textLight,
    fontWeight: '500',
  },
  infoCardValue: {
    fontSize: fontSize.normal,
    color: colors.text,
    fontWeight: '400',
  },
  
  // Itens do pedido
  itemsContainer: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    padding: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}50`,
  },
  itemText: {
    fontSize: fontSize.normal,
    color: colors.text,
    flex: 1,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dot,
    marginLeft: 12,
  },

  // Mapa
  mapContainer: {
    height: isTablet ? 350 : 250,
    marginVertical: isTablet ? 12 : 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.backgroundLight,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerImage: {
    width: 40,
    height: 40,
  },
  mapButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  mapButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.normal,
    fontWeight: '600',
  },
  
  // Rating
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  starIcon: {
    marginHorizontal: 2,
  },
  reviewContainer: {
    borderTopWidth: 1,
    borderTopColor: `${colors.border}80`,
    paddingTop: 12,
    marginTop: 8,
  },
  reviewLabel: {
    fontSize: fontSize.normal,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 4,
  },
  reviewText: {
    fontSize: fontSize.normal,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  noRatingContainer: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: `${colors.border}50`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noRatingText: {
    fontSize: fontSize.normal,
    color: colors.textLighter,
    fontStyle: 'italic',
  },
  
  // Motivo de cancelamento
  cancelReasonContainer: {
    backgroundColor: colors.backgroundDanger,
    borderRadius: 10,
    padding: 14,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.borderDanger,
  },
  cancelReasonLabel: {
    fontSize: fontSize.normal,
    fontWeight: '600',
    color: colors.textDanger,
    marginBottom: 6,
  },
  cancelReasonText: {
    fontSize: fontSize.normal,
    color: colors.textDangerLight,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  
  // Controles de admin
  adminControlsContainer: {
    marginTop: 24,
    marginBottom: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    backgroundColor: colors.backgroundDanger,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderDanger,
  },
  cancelButtonText: {
    color: colors.borderDanger,
    fontSize: fontSize.normal,
    fontWeight: '600',
  },
  reactivateButton: {
    backgroundColor: colors.backgroundSuccess,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSuccess,
  },
  reactivateButtonText: {
    color: colors.textSuccess,
    fontSize: fontSize.normal,
    fontWeight: '600',
  },
  
  // Modal (com animação)
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTouchableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
  },
  modalTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: fontSize.normal,
    color: colors.textLight,
    marginBottom: 16,
  },
  cancelReasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: fontSize.normal,
    color: colors.text,
    backgroundColor: colors.backgroundLight,
    textAlignVertical: 'top',
    marginBottom: 16,
    minHeight: 100,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.backgroundLight,
    marginRight: 8,
  },
  modalConfirmButton: {
    backgroundColor: colors.borderDanger,
    marginLeft: 8,
  },
  modalCancelButtonText: {
    color: colors.textLight,
    fontSize: fontSize.normal,
    fontWeight: '600',
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.normal,
    fontWeight: '600',
  },
  
  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textLight,
    fontSize: fontSize.normal,
    textAlign: 'center',
  },
  
  // Bottom padding
  bottomPadding: {
    height: 30,
  },
  
  // Timing information styles
  timingTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  timingTotalLabel: {
    fontSize: fontSize.normal,
    fontWeight: '600',
    color: colors.accent,
  },
  timingTotalValue: {
    fontSize: fontSize.normal,
    fontWeight: '700',
    color: colors.accent,
  },
  timingStagesContainer: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
    padding: 12,
  },
  timingStagesTitle: {
    fontSize: fontSize.normal,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  timingStageRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}60`,
  },
  timingStageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timingStageLabel: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textLight,
    flex: 1,
  },
  timingStageDuration: {
    fontSize: fontSize.small,
    fontWeight: '600',
    color: colors.text,
  },
  timingStageTimeRange: {
    fontSize: 12,
    color: colors.textLighter,
    fontStyle: 'italic',
    textAlign: 'right',
  },
});