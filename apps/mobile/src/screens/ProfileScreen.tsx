import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Avatar, Card, List, Button, Text, Divider, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { clearPendingActions } from '@/store/slices/offlineSlice';
import { colors, spacing, typography } from '@/constants/theme';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { pendingActions, lastSyncTime } = useSelector((state: RootState) => state.offline);
  const { unreadCount, pushToken, permissions } = useSelector(
    (state: RootState) => state.notifications
  );
  
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(permissions.granted);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
            dispatch(clearPendingActions());
          },
        },
      ],
      { cancelable: true }
    );
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    // TODO: Update notification permissions
  };

  const formatSyncTime = () => {
    if (!lastSyncTime) return 'Never';
    const date = new Date(lastSyncTime);
    return date.toLocaleString();
  };

  return (
    <ScrollView style={styles.container}>
      {/* User Profile Card */}
      <Card style={styles.profileCard} mode="elevated">
        <Card.Content style={styles.profileContent}>
          {user?.avatar ? (
            <Avatar.Image size={80} source={{ uri: user.avatar }} />
          ) : (
            <Avatar.Icon size={80} icon="account" />
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user?.name || 'Guest User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'Not logged in'}</Text>
            <View style={styles.roleChip}>
              <MaterialCommunityIcons
                name={user?.role === 'coach' ? 'whistle' : 'account'}
                size={16}
                color={colors.primary}
              />
              <Text style={styles.roleText}>{user?.role?.toUpperCase() || 'GUEST'}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard} mode="elevated">
          <Card.Content style={styles.statContent}>
            <Text style={styles.statNumber}>{user?.teamIds?.length || 0}</Text>
            <Text style={styles.statLabel}>Teams</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard} mode="elevated">
          <Card.Content style={styles.statContent}>
            <Text style={styles.statNumber}>{unreadCount}</Text>
            <Text style={styles.statLabel}>Notifications</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard} mode="elevated">
          <Card.Content style={styles.statContent}>
            <Text style={styles.statNumber}>{pendingActions.length}</Text>
            <Text style={styles.statLabel}>Pending Sync</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Settings List */}
      <Card style={styles.settingsCard} mode="elevated">
        <List.Section>
          <List.Subheader>Account Settings</List.Subheader>
          
          <List.Item
            title="Edit Profile"
            description="Update your personal information"
            left={props => <List.Icon {...props} icon="account-edit" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          
          <List.Item
            title="Change Password"
            description="Update your account password"
            left={props => <List.Icon {...props} icon="lock" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          
          <Divider />
          
          <List.Subheader>Notifications</List.Subheader>
          
          <List.Item
            title="Push Notifications"
            description={notificationsEnabled ? 'Enabled' : 'Disabled'}
            left={props => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                color={colors.primary}
              />
            )}
          />
          
          <List.Item
            title="Notification History"
            description={`${unreadCount} unread notifications`}
            left={props => <List.Icon {...props} icon="bell-outline" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('Notifications')}
          />
          
          <Divider />
          
          <List.Subheader>App Settings</List.Subheader>
          
          <List.Item
            title="Settings"
            description="App preferences and configuration"
            left={props => <List.Icon {...props} icon="cog" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('Settings')}
          />
          
          <List.Item
            title="Offline Data"
            description={`Last sync: ${formatSyncTime()}`}
            left={props => <List.Icon {...props} icon="cloud-sync" />}
            right={() => (
              <Text style={styles.pendingText}>
                {pendingActions.length > 0 ? `${pendingActions.length} pending` : 'Synced'}
              </Text>
            )}
          />
          
          <Divider />
          
          <List.Subheader>Support</List.Subheader>
          
          <List.Item
            title="Help & Support"
            description="Get help with the app"
            left={props => <List.Icon {...props} icon="help-circle" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          
          <List.Item
            title="Terms & Privacy"
            description="View terms and privacy policy"
            left={props => <List.Icon {...props} icon="file-document" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
          
          <List.Item
            title="About"
            description="Version 1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {}}
          />
        </List.Section>
      </Card>

      {/* Logout Button */}
      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.logoutButton}
        buttonColor={colors.error}
        icon="logout"
      >
        Logout
      </Button>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Legacy Youth Sports</Text>
        <Text style={styles.footerSubtext}>Phoenix, Arizona</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileCard: {
    margin: spacing.md,
    backgroundColor: colors.primary,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  profileInfo: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  userName: {
    ...typography.h2,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  userEmail: {
    ...typography.body,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  roleText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statNumber: {
    ...typography.h2,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  settingsCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  pendingText: {
    ...typography.bodySmall,
    color: colors.warning,
    fontWeight: 'bold',
  },
  logoutButton: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  footerSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});