import React from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import styles from '../styles/searchModalStyles'

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSearch: () => Promise<void>;
  searchOrderId: string;
  setSearchOrderId: (value: string) => void;
  isLoading?: boolean;
}

const SearchModal: React.FC<SearchModalProps> = ({ 
  visible, 
  onClose, 
  onSearch, 
  searchOrderId, 
  setSearchOrderId,
  isLoading = false
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Search size={32} color="#e41c26" style={styles.modalIcon} />
          <Text style={styles.modalTitle}>Buscar Pedido</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Digite o ID do pedido"
            placeholderTextColor="#718096"
            value={searchOrderId}
            onChangeText={setSearchOrderId}
            editable={!isLoading}
            autoCapitalize='characters'            
          />
          <TouchableOpacity 
            style={[
              styles.searchButton,
              isLoading && styles.searchButtonDisabled
            ]} 
            onPress={onSearch}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.searchButtonText}>Buscar</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={styles.closeButtonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default SearchModal;