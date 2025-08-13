import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useConnectionStatus } from '@/contexts/ConnectionStatusContext';
import { colors, spacing, typography } from '@/constants/theme';

export const OfflineIndicator: React.FC = () => {
  const { isConnected } = useConnectionStatus();
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isConnected ? -60 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isConnected, slideAnim]);

  if (isConnected) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <MaterialCommunityIcons name="wifi-off" size={20} color={colors.background} />
      <Text style={styles.text}>No Internet Connection</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Offline Mode</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    zIndex: 1000,
  },
  text: {
    ...typography.bodySmall,
    color: colors.background,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginLeft: spacing.sm,
  },
  badgeText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: 'bold',
  },
});