import { useRouter } from 'expo-router';
import { FolderListScreen } from '../screens/FolderListScreen';
import { useTheme } from '../hooks/useTheme';

export default function Index() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  return (
    <FolderListScreen
      theme={theme}
      toggleTheme={toggleTheme}
      onFolderPress={(folderId) => router.push(`/folder/${folderId}`)}
      onNavigateToSubscription={() => router.push('/subscription')}
      onNavigateToManageSubscription={() => router.push('/profile?openBilling=true')}
      onNavigateToProfile={() => router.push('/profile')}
      onNavigateToSignUp={() => router.push('/signup')}
      onNavigateToSignIn={() => router.push('/login')}
    />
  );
}
