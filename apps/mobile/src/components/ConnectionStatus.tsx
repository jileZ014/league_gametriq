import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useConnectionStatus } from '@/contexts/ConnectionStatusContext';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { colors } from '@/constants/theme';
import { OfflineIndicator } from './OfflineIndicator';

export const ConnectionStatus: React.FC = () => {
  const { isConnected, isInternetReachable } = useConnectionStatus();
  const { pendingActions, syncInProgress } = useSelector((state: RootState) => state.offline);
  const [showSyncMessage, setShowSyncMessage] = React.useState(false);

  React.useEffect(() => {
    if (syncInProgress) {
      setShowSyncMessage(true);
    }
  }, [syncInProgress]);

  return (
    <>
      <OfflineIndicator />
      
      <Snackbar
        visible={showSyncMessage && syncInProgress}
        onDismiss={() => setShowSyncMessage(false)}
        duration={Snackbar.DURATION_SHORT}
        style={styles.snackbar}
      >
        Syncing {pendingActions.length} pending actions...
      </Snackbar>

      <Snackbar
        visible={showSyncMessage && !syncInProgress && pendingActions.length === 0}
        onDismiss={() => setShowSyncMessage(false)}
        duration={Snackbar.DURATION_SHORT}
        style={[styles.snackbar, styles.successSnackbar]}
      >
        All changes synced successfully!
      </Snackbar>
    </>
  );
};

const styles = StyleSheet.create({
  snackbar: {
    backgroundColor: colors.info,
  },
  successSnackbar: {
    backgroundColor: colors.success,
  },
});