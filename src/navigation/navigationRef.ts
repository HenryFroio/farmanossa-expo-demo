import { createNavigationContainerRef } from '@react-navigation/native';

// Cria uma referência global de navegação
export const navigationRef = createNavigationContainerRef();

// Variável para rastrear a última tela para a qual navegamos e quando
let lastNavigationInfo = {
  screen: null as string | null,
  timestamp: 0
};

// Função de navegação que pode ser usada fora dos componentes React
export function navigate(name: string, params?: any) {
  if (navigationRef.current) {
    // Evita navegação redundante para a mesma tela
    const currentRoute = navigationRef.current.getCurrentRoute()?.name;
    
    if (currentRoute === name) {
      console.log(`Já estamos na tela ${name}, ignorando navegação`);
      return;
    }
    
    // Evitar navegações múltiplas para a mesma tela em um curto período
    const now = Date.now();
    if (lastNavigationInfo.screen === name && now - lastNavigationInfo.timestamp < 2000) {
      console.log(`Navegação para ${name} já realizada recentemente, ignorando`);
      return;
    }
    
    console.log(`Navegando para: ${name}`);
    navigationRef.current.navigate(name, params);
    
    // Atualizar informações da última navegação
    lastNavigationInfo = {
      screen: name,
      timestamp: now
    };
  }
}

// Função para resetar completamente a navegação
export function resetRoot(state: any) {
  if (navigationRef.current) {
    try {
      // Verificar se estamos tentando navegar para a mesma tela atual
      const targetScreen = state.routes[state.index || 0].name;
      const currentRoute = navigationRef.current.getCurrentRoute()?.name;
      
      // Não resetar se já estivermos na tela de destino
      if (currentRoute === targetScreen) {
        console.log(`Já estamos na tela ${targetScreen}, ignorando resetRoot`);
        return;
      }
      
      // Evitar navegações múltiplas para a mesma tela em um curto período
      const now = Date.now();
      if (lastNavigationInfo.screen === targetScreen && now - lastNavigationInfo.timestamp < 2000) {
        console.log(`Reset para ${targetScreen} já realizado recentemente, ignorando`);
        return;
      }
      
      console.log(`Resetando navegação para: ${targetScreen}`);
      navigationRef.current.resetRoot(state);
      
      // Atualizar informações da última navegação
      lastNavigationInfo = {
        screen: targetScreen,
        timestamp: now
      };
    } catch (error) {
      console.error("Erro ao resetar navegação:", error);
    }
  } else {
    console.warn("Navigation ref not ready for resetRoot");
  }
}

// Função para obter a rota atual
export function getCurrentRoute() {
  if (navigationRef.current) {
    return navigationRef.current.getCurrentRoute()?.name;
  }
  return null;
}
