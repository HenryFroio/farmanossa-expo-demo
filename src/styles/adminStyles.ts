import { StyleSheet } from 'react-native';

const colors = {
  primary: '#e41c26',
  primaryLight: '#ff4d54',
  primaryDark: '#b81219',
  secondary: '#ff6b00',
  secondaryLight: '#ff8533',
  background: '#F8F9FA',
  cardBackground: '#FFFFFF',
  text: '#2D3748',
  textLight: '#718096',
  border: '#E2E8F0',
  shadow: '#000',
  white: 'white'
};

const shadows = {
  small: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  medium: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  large: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 7,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#e41c26'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    ...shadows.large,
  },
  headerLeft: {
    justifyContent: 'center',
    zIndex: 1,
  },
  headerRight: {
    justifyContent: 'center',
    zIndex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  errorText: {
    color: '#e41c26',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  searchButton: {
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 12,
    ...shadows.small,
  },
  searchButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  section: {
    marginHorizontal: 20,
    marginVertical: 15,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    ...shadows.medium,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: `${colors.primary}20`,
  },
  unitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unitName: {
    fontSize: 17,
    color: colors.text,
    fontWeight: '500',
  },
  unitDeliveries: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  searchResultName: {
    fontSize: 17,
    color: colors.text,
    flex: 1,
    fontWeight: '500',
  },
  searchResultDeliveries: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
    backgroundColor: `${colors.secondary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10,
  },
  searchInputContainer: {
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 20,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    ...shadows.small,
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: colors.cardBackground,
    ...shadows.small,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    color: colors.text,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  logoutButton: {
    backgroundColor: '#e41c26',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    margin: 16,
    marginTop: 8,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionLoading: {
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    marginBottom: 10,
  },
  sectionLoadingText: {
    marginTop: 10,
    color: '#4A5568',
    fontSize: 14,
  },
});

export default styles;