import { useRouter, useLocalSearchParams } from 'expo-router';
import { FolderItemsScreen } from '../../screens/FolderItemsScreen';
import { useTheme } from '../../hooks/useTheme';

export default function FolderDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { theme, toggleTheme } = useTheme();

  return (
    <FolderItemsScreen
      folderId={id}
      onBack={() => router.back()}
      theme={theme}
      toggleTheme={toggleTheme}
      onNavigateToSubscription={() => router.push('/subscription')}
    />
  );
}
