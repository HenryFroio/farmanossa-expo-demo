import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  FlatList, 
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator
} from 'react-native';
import { 
  BikeIcon, 
  Building2, 
  FileText, 
  Search, 
  CheckCircle,
  Users,
  KeySquare,
  ClipboardList
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, query as firebaseQuery, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import styles from '../styles/searchDrawerStyles';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.9;

interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAnimationEnd?: () => void;
  onSearch: (type: SearchType, mode: SelectionMode, query: string) => any[];
  onSelect: (selected: string | string[] | any, type: SearchType) => void;
  userRole?: string;
  userUnitId?: string;
}

type SearchType = 'deliveryman' | 'unit' | 'order' | 'employee' | 'vehicle' | null;
type SelectionMode = 'single' | 'multiple';

interface ListItem {
  id?: string;
  type: string;
  name?: string;
  orderId?: string;
  status?: string;
}

const SearchDrawer: React.FC<SearchDrawerProps> = ({
  isOpen,
  onClose,
  onAnimationEnd,
  onSearch,
  onSelect,
  userRole,
  userUnitId
}) => {
  const navigation = useNavigation();
  const [searchType, setSearchType] = useState<SearchType>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setError(null);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: DRAWER_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      setIsClosing(false);
      setError(null);
        // Chama onAnimationEnd imediatamente após o fechamento
      onAnimationEnd?.();
    });
  };

  useEffect(() => {
    if (!isOpen) {
      setSearchType(null);
      setQuery('');
      setSearchResults([]);
      setSelectedItems([]);
      setError(null);
    }
  }, [isOpen]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return gestureState.dx > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dx > 0) {
        translateX.setValue(gestureState.dx);
        const newOpacity = 1 - (gestureState.dx / (DRAWER_WIDTH));
        fadeAnim.setValue(newOpacity);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > DRAWER_WIDTH / 3) {
        handleClose();
      } else {
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
  });

  const searchOrders = async (searchQuery: string) => {
    setLoading(true);
    console.log('[SearchDrawer] searchOrders called with query:', searchQuery);
    console.log('[SearchDrawer] userRole:', userRole, 'userUnitId:', userUnitId);
    
    try {
      const ordersRef = collection(db, 'orders');
      let queryRef;
  
      // Se for gerente, adiciona filtro da unidade junto com a busca
      if (userRole === 'manager') {
        console.log('[SearchDrawer] Manager mode, filtering by unit');
        // Sempre busca primeiro pelo orderId, independente se tem letras ou números
        queryRef = firebaseQuery(
          ordersRef, 
          where('orderId', '==', searchQuery),
          where('pharmacyUnitId', '==', userUnitId)
        );
      } 
      // Se não for gerente, faz a busca normal
      else {
        console.log('[SearchDrawer] Admin mode, no unit filter');
        // Sempre busca primeiro pelo orderId, independente se tem letras ou números
        queryRef = firebaseQuery(ordersRef, where('orderId', '==', searchQuery));
      }
  
      const snapshot = await getDocs(queryRef);
      console.log('[SearchDrawer] Query returned', snapshot.docs.length, 'results');
      
      const orders = snapshot.docs.map(doc => {
        console.log('[SearchDrawer] Order found:', doc.id, doc.data().orderId);
        return {
          id: doc.id,
          orderId: doc.data().orderId,
          status: doc.data().status,
          type: 'result',
          ...doc.data()
        };
      });
  
      console.log('[SearchDrawer] Setting search results:', orders.length, 'orders');
      setSearchResults(orders || []);
    } catch (error) {
      console.error('[SearchDrawer] Error searching orders:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };
    
  const handleSearch = async () => {
    if (searchType && query.trim()) {
      if (searchType === 'order') {
        await searchOrders(query.trim());
      } else {
        const results = onSearch(searchType, selectionMode, query);
        setSearchResults(results || []);
      }
    }
  };

  const handleSearchType = (type: SearchType) => {
    setError(null);
    if (userRole === 'manager' && type === 'unit' && userUnitId) {
      onSelect(userUnitId, 'unit');
      handleClose();
      return;
    }

    setSearchType(type);
    setSearchResults([]);
    setQuery('');
    setSelectedItems([]);

    if (type === 'order') {
      setSelectionMode('single');
    }

    if (userRole === 'manager' && type === 'unit') {
      const results = onSearch('unit', 'single', '');
      setSearchResults(results || []);
    }
  };


  const handleSelect = (id: string) => {
    console.log('[SearchDrawer] handleSelect called', { id, searchType, selectionMode });
    
    if (searchType === 'order' || selectionMode === 'single') {
      // Para pedidos, chama onSelect e fecha o drawer de forma sincronizada
      if (searchType === 'order') {
        console.log('[SearchDrawer] Order selected, starting close animation');
        
        // Encontra o pedido completo nos resultados da busca
        const fullOrder = searchResults.find(result => result.id === id);
        console.log('[SearchDrawer] Full order data:', fullOrder);
        
        // Fecha o drawer primeiro, mas chama onSelect APÓS a animação de fechamento
        setIsClosing(true);
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: DRAWER_WIDTH,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          console.log('[SearchDrawer] Close animation finished, calling onSelect');
          // Passa o pedido completo em vez de apenas o ID
          onSelect(fullOrder || id, searchType);
          console.log('[SearchDrawer] onSelect called, calling onClose');
          onClose();
          setIsClosing(false);
          setError(null);
          // Chama onAnimationEnd após tudo
          console.log('[SearchDrawer] Calling onAnimationEnd');
          onAnimationEnd?.();
        });
      } else {
        console.log('[SearchDrawer] Non-order selection, using standard flow');
        // Para outros tipos, mantém o comportamento original
        onSelect(id, searchType);
        handleClose();
      }
    } else {
      console.log('[SearchDrawer] Multiple selection mode');
      const updatedSelection = selectedItems.includes(id)
        ? selectedItems.filter(item => item !== id)
        : [...selectedItems, id];
      setSelectedItems(updatedSelection);
    }
  };

  const handleNavigation = (screen: string) => {
    handleClose();
    // @ts-ignore - Navigation typing is complex, this simplification is acceptable
    navigation.navigate(screen);
  };

  const renderButtons = () => (
    <View style={styles.buttonContainer}>
      <TouchableOpacity
        style={[styles.button, searchType === 'deliveryman' && styles.activeButton]}
        onPress={() => handleSearchType('deliveryman')}
      >
        <BikeIcon size={24} color={searchType === 'deliveryman' ? '#FFF' : '#FF4B2B'} />
        <Text style={[styles.buttonText, searchType === 'deliveryman' && styles.activeButtonText]}>
          Buscar Entregador(es)
        </Text>
      </TouchableOpacity>
  
      <TouchableOpacity
        style={[styles.button, searchType === 'unit' && styles.activeButton]}
        onPress={() => handleSearchType('unit')}
      >
        <Building2 size={24} color={searchType === 'unit' ? '#FFF' : '#FF4B2B'} />
        <Text style={[styles.buttonText, searchType === 'unit' && styles.activeButtonText]}>
          {userRole === 'manager' ? 'Ver Minha Unidade' : 'Buscar Unidade(s)'}
        </Text>
      </TouchableOpacity>
  
      <TouchableOpacity
        style={[styles.button, searchType === 'order' && styles.activeButton]}
        onPress={() => handleSearchType('order')}
      >
        <FileText size={24} color={searchType === 'order' ? '#FFF' : '#FF4B2B'} />
        <Text style={[styles.buttonText, searchType === 'order' && styles.activeButtonText]}>
          Buscar Pedido
        </Text>
      </TouchableOpacity>
  
      {(userRole === 'admin' || userRole === 'manager') && (
        <>
          <TouchableOpacity
            style={styles.button}
            onPress={() => handleNavigation('Employees')}
          >
            <Users size={24} color="#FF4B2B" />
            <Text style={styles.buttonText}>
              Funcionários
            </Text>
          </TouchableOpacity>
  
          <TouchableOpacity
            style={styles.button}
            onPress={() => handleNavigation('Vehicles')}
          >
            <KeySquare size={24} color="#FF4B2B" />
            <Text style={styles.buttonText}>
              Veículos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => handleNavigation('Forms')}
          >
            <ClipboardList size={24} color="#FF4B2B" />
            <Text style={styles.buttonText}>
              Formulários
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderSelectionMode = () => (
    <View style={styles.selectionModeContainer}>
      <TouchableOpacity
        style={[styles.modeButton, selectionMode === 'single' && styles.activeModeButton]}
        onPress={() => setSelectionMode('single')}
      >
        <Text style={[
          styles.modeButtonText,
          selectionMode === 'single' && styles.activeModeButtonText
        ]}>
          Selecionar apenas um
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modeButton, selectionMode === 'multiple' && styles.activeModeButton]}
        onPress={() => setSelectionMode('multiple')}
      >
        <Text style={[
          styles.modeButtonText,
          selectionMode === 'multiple' && styles.activeModeButtonText
        ]}>
          Selecionar vários
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchInput = () => (
    <View style={styles.inputContainer}>
      <View style={styles.inputWrapper}>
        <Search size={20} color="#718096" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={`Buscar ${
            searchType === 'deliveryman' ? 'entregador' 
            : searchType === 'unit' ? 'unidade' 
            : 'pedido'
          }...`}
          placeholderTextColor="gray"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          inputMode={'text'}
          autoCapitalize='characters'
        />
      </View>
      <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
        <Text style={styles.searchButtonText}>Buscar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderResult = (item: ListItem) => (
    <TouchableOpacity
      style={[
        styles.searchResultItem,
        selectionMode === 'multiple' && selectedItems.includes(item.id!) && styles.selectedItem
      ]}
      onPress={() => handleSelect(item.id!)}
    >
      <Text style={styles.searchResultText}>
        {searchType === 'order' 
          ? `Pedido: ${item.orderId} - ${item.status}`
          : searchType === 'deliveryman' ? item.name : item.id}
      </Text>
      {selectionMode === 'multiple' && selectedItems.includes(item.id!) && (
        <CheckCircle size={24} color="#FF4B2B" />
      )}
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.type) {
      case 'buttons':
        return renderButtons();
      case 'selectionMode':
        if (searchType !== 'order' && userRole !== 'manager') {
          return renderSelectionMode();
        }
        return null;
      case 'input':
        if (!(userRole === 'manager' && searchType === 'unit')) {
          return renderSearchInput();
        }
        return null;
      case 'result':
        if (item.id) {
          return renderResult(item);
        }
        return null;
      default:
        return null;
    }
  };

  const listData = [
    { type: 'buttons' },
    ...(searchType ? [
      { type: 'selectionMode' },
      { type: 'input' }
    ] : []),
    ...searchResults.map(result => ({ type: 'result', ...result }))
  ];

  if (!isOpen && !isClosing) return null;

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 1000,
    }}>
      <Animated.View 
        style={[{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: fadeAnim,
        }]} 
      />
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.drawer,
          {
            transform: [{ translateX }]
          }
        ]}
      >
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.type}-${index}`}
          contentContainerStyle={styles.contentContainer}
          bounces={false}
        />
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF4B2B" />
          </View>
        )}
        {selectionMode === 'multiple' && selectedItems.length > 0 && (
          <TouchableOpacity 
            style={styles.confirmButton} 
            onPress={() => {
              onSelect(selectedItems, searchType);
              handleClose();
            }}
          >
            <Text style={styles.confirmButtonText}>
              Confirmar Seleção ({selectedItems.length})
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

export default SearchDrawer;