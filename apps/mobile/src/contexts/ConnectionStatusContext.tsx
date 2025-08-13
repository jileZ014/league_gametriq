import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useDispatch } from 'react-redux';
import { setOnlineStatus } from '@/store/slices/offlineSlice';

interface ConnectionStatusContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
}

const ConnectionStatusContext = createContext<ConnectionStatusContextType>({
  isConnected: true,
  isInternetReachable: true,
  connectionType: null,
});

export const useConnectionStatus = () => useContext(ConnectionStatusContext);

export const ConnectionStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusContextType>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const newStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
      };
      
      setConnectionStatus(newStatus);
      dispatch(setOnlineStatus(newStatus.isConnected && (newStatus.isInternetReachable ?? true)));
    });

    // Get initial state
    NetInfo.fetch().then(state => {
      const newStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
      };
      
      setConnectionStatus(newStatus);
      dispatch(setOnlineStatus(newStatus.isConnected && (newStatus.isInternetReachable ?? true)));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch]);

  return (
    <ConnectionStatusContext.Provider value={connectionStatus}>
      {children}
    </ConnectionStatusContext.Provider>
  );
};