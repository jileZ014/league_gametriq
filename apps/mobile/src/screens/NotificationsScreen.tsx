import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Text, IconButton, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { markAsRead, removeNotification } from '@/store/slices/notificationsSlice';
import { colors, spacing, typography } from '@/constants/theme';
import { Notification } from '@/types';

export default function NotificationsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { notifications } = useSelector((state: RootState) => state.notifications);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'game_start':
        return 'basketball';
      case 'score_update':
        return 'scoreboard';
      case 'game_final':
        return 'trophy';
      case 'schedule_change':
        return 'calendar-alert';
      case 'announcement':
        return 'bullhorn';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'game_start':
        return colors.live;
      case 'score_update':
        return colors.info;
      case 'game_final':
        return colors.success;
      case 'schedule_change':
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <Card
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      mode="elevated"
      onPress={() => dispatch(markAsRead(item.id))}
    >
      <Card.Content style={styles.notificationContent}>
        <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) }]}>
          <MaterialCommunityIcons
            name={getNotificationIcon(item.type) as any}
            size={24}
            color={colors.background}
          />
        </View>
        
        <View style={styles.notificationBody}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, !item.read && styles.unreadText]}>
              {item.title}
            </Text>
            {!item.read && (
              <Chip style={styles.unreadChip} textStyle={styles.unreadChipText}>
                NEW
              </Chip>
            )}
          </View>
          <Text style={styles.notificationText}>{item.body}</Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>
        
        <IconButton
          icon="close"
          size={20}
          onPress={() => dispatch(removeNotification(item.id))}
        />
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="bell-off"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>
              You'll see game updates and announcements here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  notificationCard: {
    marginBottom: spacing.md,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  notificationBody: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  notificationTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  unreadChip: {
    height: 20,
    marginLeft: spacing.sm,
  },
  unreadChipText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  notificationText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: spacing.xxl * 2,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});