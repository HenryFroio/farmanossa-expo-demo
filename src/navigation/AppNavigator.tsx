import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, Platform } from 'react-native';

// Screens
import SplashScreen from '../screens/SplashScreen';
import ClientScreen from '../screens/ClientScreen';
import DeliverymanScreen from '../screens/DeliverymanScreen';
import AdminScreen from '../screens/AdminScreen';
import StatsScreen from '../screens/StatsScreen';
import AnonScreen from '../screens/AnonScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import EmployeesScreen from '../screens/EmployeesScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import OrdersScreen from '../screens/OrdersScreen'; // Import the new screen
import FormsScreen from '../screens/FormsScreen';

const Stack = createStackNavigator();

export type RootStackParamList = {
  Splash: undefined;
  Client: undefined;
  Deliveryman: undefined;
  Admin: undefined;
  SignUp: undefined;
  Login: undefined;
  Stats: undefined;
  Anon: undefined;
  Employees: undefined;
  Vehicles: undefined;
  Forms: undefined;
  OrdersScreen: { type: 'deliveryman' | 'unit'; ids: string[]; initialDate: string };
  OrderDetailsScreen: { orderId: string };
};

const AppNavigator = () => {
  return (
    <>
      <StatusBar 
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
      />      
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#F8F9FA' },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Client" component={ClientScreen} />
        <Stack.Screen name="Deliveryman" component={DeliverymanScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Stats" component={StatsScreen} />
        <Stack.Screen name="Anon" component={AnonScreen} />
        <Stack.Screen name="Employees" component={EmployeesScreen} />
        <Stack.Screen name="Vehicles" component={VehiclesScreen} />
        <Stack.Screen name="Forms" component={FormsScreen} />
        <Stack.Screen 
          name="OrdersScreen" 
          component={OrdersScreen} 
          options={{ headerShown: false }} 
        />
      </Stack.Navigator>
    </>
  );
};

export default AppNavigator;