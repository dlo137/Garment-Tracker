import React from 'react';
import SubscriptionScreen from './screens/SubscriptionScreen';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import FolderListScreen from './screens/FolderListScreen';
import FolderItemsScreen from './screens/FolderItemsScreen';

const Stack = createStackNavigator();

export default function AppNavigator({ theme, toggleTheme, onFolderPress, handleFolderPress, handleBack, selectedFolderId }) {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="FolderListScreen" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="FolderListScreen">
          {props => (
            <FolderListScreen {...props} theme={theme} toggleTheme={toggleTheme} onFolderPress={handleFolderPress} />
          )}
        </Stack.Screen>
        <Stack.Screen name="FolderItemsScreen">
          {props => (
            <FolderItemsScreen {...props} folderId={selectedFolderId} onBack={handleBack} theme={theme} toggleTheme={toggleTheme} />
          )}
        </Stack.Screen>
        <Stack.Screen name="SubscriptionScreen" component={SubscriptionScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
