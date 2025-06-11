import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const isSmallDevice = width < 375; // iPhone SE e similares

// Função auxiliar melhorada para calcular tamanhos responsivos
const calculateSize = (size: number, tabletMultiplier: number = 1.2): number => {
  const baseWidth = 375; // Base width (iPhone X)
  let calculated = (width * size) / baseWidth;
  
  // Para dispositivos pequenos, reduzimos ainda mais
  if (isSmallDevice) {
    calculated = calculated * 0.85;
  }
  
  // Para tablets, aumentamos o multiplicador para evitar elementos muito pequenos
  if (isTablet) {
    return size * tabletMultiplier; // Aumentado de 1.0 para 1.2
  }
  
  return calculated;
};

export default StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#e41c26'
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    flexGrow: 1, // Permite que o conteúdo se expanda dentro do scroll
    paddingBottom: 20, // Espaço adicional no final do scroll
  },
  header: {
    backgroundColor: '#F8F9FA',
    paddingVertical: calculateSize(8),
    paddingHorizontal: calculateSize(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchButtonDisabled: {
    opacity: 0.7,
  },
  logo: {
    width: isSmallDevice ? '75%' : (isTablet ? '55%' : '85%'), // Aumentando ligeiramente para tablets
    maxWidth: isTablet ? 400 : 400, // Aumentando o máximo de 300 para 400 em tablets
    height: isSmallDevice ? 100 : (isTablet ? 140 : 130), // Aumentando de 110 para 140 em tablets
    alignSelf: 'center',
    resizeMode: 'contain',
    marginVertical: isSmallDevice ? 10 : (isTablet ? 25 : 20), // Aumentando margens em tablets
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: calculateSize(12),
    marginTop: 10,
  },
  loginLinkText: {
    fontSize: calculateSize(16),
    color: '#4A5568',
    marginRight: calculateSize(6),
  },
  loginLinkHighlight: {
    color: '#e41c26',
    fontWeight: '600',
  },
  emptyStateContainer: {
    flexGrow: 1, // Em vez de flex: 1
    alignItems: 'center',
    paddingHorizontal: calculateSize(16),
    paddingTop: isSmallDevice ? calculateSize(10) : calculateSize(20),
  },
  illustrationContainer: {
    width: isTablet ? 130 : calculateSize(80), // Aumentando de 100 para 130 em tablets
    height: isTablet ? 130 : calculateSize(80), // Aumentando de 100 para 130 em tablets
    backgroundColor: 'rgba(228, 28, 38, 0.1)',
    borderRadius: isTablet ? 65 : calculateSize(40), // Ajustando para manter circular
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isTablet ? 30 : calculateSize(16), // Aumentando margens
  },
  welcomeTitle: {
    fontSize: isSmallDevice ? calculateSize(18) : (isTablet ? 32 : calculateSize(22)), // Aumentando de 28 para 32
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: isTablet ? 12 : calculateSize(4), // Aumentando margens
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: isSmallDevice ? calculateSize(12) : (isTablet ? 20 : calculateSize(14)), // Aumentando de 18 para 20
    color: '#718096',
    marginBottom: isTablet ? 30 : calculateSize(16), // Aumentando margens
    textAlign: 'center',
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: isTablet ? 24 : calculateSize(16), // Aumentando de 20 para 24
    padding: isTablet ? 32 : (isSmallDevice ? calculateSize(16) : calculateSize(20)), // Aumentando padding
    width: isSmallDevice ? '95%' : (isTablet ? '70%' : '90%'), // Aumentando largura de 60% para 70%
    maxWidth: isTablet ? 550 : 700, // Aumentando tamanho máximo em tablets
    alignItems: 'center',
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
    marginBottom: isTablet ? 30 : calculateSize(12), // Aumentando margem inferior
  },
  searchCardTitle: {
    fontSize: isTablet ? 22 : calculateSize(16), // Definindo tamanho específico para tablets
    fontWeight: isTablet ? '700' : '600', // Aumentando peso da fonte em tablets
    color: '#2D3748',
    marginBottom: isTablet ? 10 : calculateSize(4), // Aumentando margens
  },
  searchCardDescription: {
    fontSize: isTablet ? 16 : calculateSize(13), // Aumentando fonte em tablets
    color: '#718096',
    textAlign: 'center',
    marginBottom: isTablet ? 24 : calculateSize(16), // Aumentando margens
    paddingHorizontal: isSmallDevice ? 5 : (isTablet ? 10 : 0), // Adicionando padding horizontal em tablets
  },
  searchButton: {
    backgroundColor: '#e41c26',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTablet ? 16 : calculateSize(10), // Aumentando padding
    paddingHorizontal: isTablet ? 24 : calculateSize(16), // Aumentando padding
    borderRadius: isTablet ? 16 : calculateSize(12), // Aumentando raio
    width: '100%',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: isTablet ? 18 : calculateSize(14), // Aumentando fonte
    fontWeight: '600',
    marginLeft: isTablet ? 10 : calculateSize(6), // Aumentando margem
  },
  infoContainer: {
    marginTop: calculateSize(5),
    width: isSmallDevice ? '95%' : '90%',
    paddingHorizontal: calculateSize(4),
  },
  benefitsCard: {
    backgroundColor: '#FFFFFF',
    padding: isTablet ? 24 : (isSmallDevice ? calculateSize(12) : calculateSize(16)), // Aumentando padding
    borderRadius: isTablet ? 20 : calculateSize(16), // Aumentando raio
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  benefitsIcon: {
    marginBottom: isTablet ? 16 : calculateSize(8), // Aumentando margem
  },
  benefitsTitle: {
    fontSize: isTablet ? 18 : calculateSize(14), // Aumentando fonte
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: isTablet ? 10 : calculateSize(4), // Aumentando margem
  },
  benefitsDescription: {
    fontSize: isTablet ? 15 : calculateSize(12), // Aumentando fonte
    color: '#718096',
    textAlign: 'center',
    lineHeight: isTablet ? 24 : calculateSize(16), // Aumentando linha
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: calculateSize(24),
    borderTopRightRadius: calculateSize(24),
    padding: calculateSize(20),
    maxHeight: height * 0.9,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: calculateSize(12),
  },
  modalTitle: {
    fontSize: calculateSize(16),
    fontWeight: '600',
    color: '#2D3748',
  },
  modalCloseButton: {
    padding: calculateSize(4),
  },
  modalDescription: {
    fontSize: calculateSize(13),
    color: '#718096',
    marginBottom: calculateSize(20),
  },
  inputContainer: {
    width: '100%',
    marginBottom: calculateSize(16),
  },
  searchInput: {
    backgroundColor: '#F7FAFC',
    borderRadius: calculateSize(12),
    paddingVertical: calculateSize(10),
    paddingHorizontal: calculateSize(14),
    fontSize: calculateSize(15),
    color: '#2D3748',
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInputError: {
    borderColor: '#e41c26',
    borderWidth: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: calculateSize(6),
    paddingHorizontal: calculateSize(4),
  },
  errorText: {
    color: '#e41c26',
    fontSize: calculateSize(13),
    marginLeft: calculateSize(4),
    flex: 1,
  },
  modalSearchButton: {
    backgroundColor: '#e41c26',
    paddingVertical: calculateSize(12),
    borderRadius: calculateSize(12),
    alignItems: 'center',
  },
  modalSearchButtonText: {
    color: '#FFFFFF',
    fontSize: calculateSize(15),
    fontWeight: '600',
  }
});