// src/styles/VehiclesScreenStyles.ts
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
    height: 40, // Added to ensure consistent height with button
    borderColor: '#ccc', // Optional: for visual separation if needed
    borderWidth: 1, // Optional: for visual separation if needed
    borderRadius: 5, // Optional: for visual separation if needed
    paddingHorizontal: 10, // Optional: for visual separation if needed
    backgroundColor: '#fff', // Optional: for visual separation if needed
  },
  searchButton: {
    padding: 10,
    marginLeft: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  vehicleInfo: {
    flex: 1,
    marginRight: 12
  },
  vehiclePlate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#718096'
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  editButton: {
    padding: 8,
    marginRight: 8
  },
  deleteButton: {
    padding: 8
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#FF4B2B',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3748',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center'
  },
  placeholderText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 24
  },
  errorText: {
    fontSize: 16,
    color: '#E53E3E',
    textAlign: 'center',
    marginBottom: 16
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FF4B2B',
    borderRadius: 6,
    alignSelf: 'center'
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500'
  }
});

