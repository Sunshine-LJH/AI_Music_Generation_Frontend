import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';

import AuthScreen from './modules/AuthScreen';
import MainScreen from './modules/MainScreen';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: [], 
  config: {
    screens: {
      'AI Music Generation System': '/', // 网站根目录
      'Create Your Music': 'create', // 主页面对应 /create 路径
    },
  },
};

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <NavigationContainer linking={linking} fallback={<Text>Loading...</Text>}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="AI Music Generation System" component={AuthScreen} />
          <Stack.Screen name="Create Your Music" component={MainScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
