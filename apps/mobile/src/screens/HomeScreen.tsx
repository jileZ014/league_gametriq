import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, Chip, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { GameCard } from '@/components/GameCard';
import { LiveScoreWidget } from '@/components/LiveScoreWidget';
import { colors, spacing, typography } from '@/constants/theme';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const [refreshing, setRefreshing] = React.useState(false);

  const { user } = useSelector((state: RootState) => state.auth);
  const { liveGames, upcomingGames, liveScores } = useSelector((state: RootState) => state.games);
  const { myTeams } = useSelector((state: RootState) => state.teams);
  const { unreadCount } = useSelector((state: RootState) => state.notifications);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // TODO: Fetch latest data
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Welcome Header */}
      <Card style={styles.welcomeCard} mode="elevated">
        <Card.Content>
          <View style={styles.welcomeHeader}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
            </View>
            {user?.avatar ? (
              <Avatar.Image size={48} source={{ uri: user.avatar }} />
            ) : (
              <Avatar.Icon size={48} icon="account" />
            )}
          </View>
          
          {unreadCount > 0 && (
            <Button
              mode="contained-tonal"
              icon="bell"
              onPress={() => navigation.navigate('Profile', { screen: 'Notifications' })}
              style={styles.notificationButton}
            >
              {unreadCount} New Notifications
            </Button>
          )}
        </Card.Content>
      </Card>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard} mode="elevated">
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="basketball" size={24} color={colors.live} />
            <Text style={styles.statNumber}>{liveGames.length}</Text>
            <Text style={styles.statLabel}>Live Games</Text>
          </Card.Content>
        </Card>
        
        <Card style={styles.statCard} mode="elevated">
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="calendar-clock" size={24} color={colors.upcoming} />
            <Text style={styles.statNumber}>{upcomingGames.length}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </Card.Content>
        </Card>
        
        <Card style={styles.statCard} mode="elevated">
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="account-group" size={24} color={colors.primary} />
            <Text style={styles.statNumber}>{myTeams.length}</Text>
            <Text style={styles.statLabel}>My Teams</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Live Games Section */}
      {liveGames.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Live Games</Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Games')}
              contentStyle={styles.viewAllButton}
            >
              View All
            </Button>
          </View>
          {liveGames.slice(0, 3).map((game) => {
            const liveScore = liveScores[game.id];
            return liveScore ? (
              <LiveScoreWidget
                key={game.id}
                gameId={game.id}
                homeTeamName={game.homeTeamName}
                awayTeamName={game.awayTeamName}
                liveScore={liveScore}
                onPress={() => navigation.navigate('Games', {
                  screen: 'GameDetails',
                  params: { gameId: game.id }
                })}
              />
            ) : (
              <GameCard
                key={game.id}
                game={game}
                onPress={() => navigation.navigate('Games', {
                  screen: 'GameDetails',
                  params: { gameId: game.id }
                })}
                showLeague={false}
              />
            );
          })}
        </View>
      )}

      {/* Upcoming Games Section */}
      {upcomingGames.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Games</Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Games')}
              contentStyle={styles.viewAllButton}
            >
              View All
            </Button>
          </View>
          {upcomingGames.slice(0, 3).map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onPress={() => navigation.navigate('Games', {
                screen: 'GameDetails',
                params: { gameId: game.id }
              })}
              showLeague={false}
            />
          ))}
        </View>
      )}

      {/* My Teams Section */}
      {myTeams.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Teams</Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Teams')}
              contentStyle={styles.viewAllButton}
            >
              View All
            </Button>
          </View>
          {myTeams.map((team) => (
            <Card
              key={team.id}
              style={styles.teamCard}
              mode="elevated"
              onPress={() => navigation.navigate('Teams', {
                screen: 'TeamDetails',
                params: { teamId: team.id }
              })}
            >
              <Card.Content style={styles.teamCardContent}>
                <View style={styles.teamInfo}>
                  {team.logo ? (
                    <Avatar.Image size={40} source={{ uri: team.logo }} />
                  ) : (
                    <Avatar.Text size={40} label={team.name.substring(0, 2)} />
                  )}
                  <View style={styles.teamDetails}>
                    <Text style={styles.teamName}>{team.name}</Text>
                    <Text style={styles.teamDivision}>{team.division}</Text>
                  </View>
                </View>
                <View style={styles.teamRecord}>
                  <Text style={styles.recordText}>{team.wins}-{team.losses}</Text>
                  <Text style={styles.recordLabel}>Record</Text>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <Button
            mode="elevated"
            icon="calendar"
            onPress={() => navigation.navigate('Games')}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
          >
            Schedule
          </Button>
          <Button
            mode="elevated"
            icon="trophy"
            onPress={() => navigation.navigate('Standings')}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
          >
            Standings
          </Button>
          <Button
            mode="elevated"
            icon="account-group"
            onPress={() => navigation.navigate('Teams')}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
          >
            Teams
          </Button>
          <Button
            mode="elevated"
            icon="cog"
            onPress={() => navigation.navigate('Profile', { screen: 'Settings' })}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
          >
            Settings
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  welcomeCard: {
    margin: spacing.md,
    backgroundColor: colors.primary,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    ...typography.bodySmall,
    color: colors.secondary,
  },
  userName: {
    ...typography.h2,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  notificationButton: {
    marginTop: spacing.md,
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
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    marginVertical: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  viewAllButton: {
    marginRight: -spacing.sm,
  },
  teamCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  teamCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamDetails: {
    marginLeft: spacing.md,
  },
  teamName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  teamDivision: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  teamRecord: {
    alignItems: 'center',
  },
  recordText: {
    ...typography.h4,
    color: colors.text,
  },
  recordLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
  },
  actionButton: {
    width: '48%',
    margin: '1%',
  },
  actionButtonContent: {
    paddingVertical: spacing.sm,
  },
});