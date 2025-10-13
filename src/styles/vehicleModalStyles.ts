// src/styles/VehicleModalStyles.ts
import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export default StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: height * 0.5,
    maxHeight: height * 0.85,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalDragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3748',
  },
  closeButton: {
    padding: 4,
  },  formContainer: {
    padding: 16,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#2D3748',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerContainer: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  disabledPickerContainer: {
    backgroundColor: '#f5f5f5',
    opacity: 0.7,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#718096',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#FF4B2B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  unitSelector: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});