import { useRouter } from 'expo-router';
import SignUpScreen from '../screens/SignUpScreen';
import { useTheme } from '../hooks/useTheme';

export default function SignUpRoute() {
  const router = useRouter();
  const { theme } = useTheme();

  const navigation = {
    goBack: () => router.back(),
    navigate: (screen) => {
      if (screen === 'Login') {
        router.push('/login');
      }
    },
  };

  return <SignUpScreen navigation={navigation} theme={theme} />;
}
