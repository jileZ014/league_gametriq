import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Button, Avatar, Chip, DataTable } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { colors, spacing, typography } from '@/constants/theme';

export default function TeamDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { teamId } = route.params;
  
  const team = useSelector((state: RootState) =>
    state.teams.teams.find(t => t.id === teamId)
  );

  if (!team) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Team not found</Text>
      </View>
    );
  }

  const winPercentage = team.wins + team.losses > 0
    ? ((team.wins / (team.wins + team.losses)) * 100).toFixed(1)
    : '0.0';

  const pointDifferential = team.pointsFor - team.pointsAgainst;

  return (
    <ScrollView style={styles.container}>
      {/* Team Header Card */}
      <Card style={styles.headerCard} mode="elevated">
        <Card.Content>
          <View style={styles.teamHeader}>
            {team.logo ? (
              <Avatar.Image size={80} source={{ uri: team.logo }} />
            ) : (
              <Avatar.Text size={80} label={team.name.substring(0, 2)} />
            )}
            <View style={styles.teamInfo}>
              <Text style={styles.teamName}>{team.name}</Text>
              <Text style={styles.division}>{team.division} • {team.ageGroup}</Text>
              <View style={styles.coachRow}>
                <MaterialCommunityIcons name="whistle" size={16} color={colors.textSecondary} />
                <Text style={styles.coachName}>Coach {team.coachName}</Text>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{team.wins}-{team.losses}</Text>
              <Text style={styles.statLabel}>RECORD</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{winPercentage}%</Text>
              <Text style={styles.statLabel}>WIN %</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[
                styles.statValue,
                pointDifferential > 0 ? styles.positive : styles.negative
              ]}>
                {pointDifferential > 0 ? '+' : ''}{pointDifferential}
              </Text>
              <Text style={styles.statLabel}>DIFF</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{team.pointsFor}</Text>
              <Text style={styles.statLabel}>PTS FOR</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          icon="account-group"
          onPress={() => navigation.navigate('Roster', { teamId: team.id })}
          style={styles.actionButton}
        >
          View Roster
        </Button>
        <Button
          mode="contained-tonal"
          icon="calendar"
          onPress={() => {}}
          style={styles.actionButton}
        >
          Schedule
        </Button>
      </View>

      {/* Upcoming Games */}
      {team.upcomingGames && team.upcomingGames.length > 0 && (
        <Card style={styles.card} mode="elevated">
          <Card.Title title="Upcoming Games" />
          <Card.Content>
            {team.upcomingGames.slice(0, 3).map((game, index) => (
              <View key={game.id} style={styles.gameRow}>
                <View style={styles.gameInfo}>
                  <Text style={styles.gameTeams}>
                    {game.homeTeamId === team.id ? 'vs' : '@'} {
                      game.homeTeamId === team.id ? game.awayTeamName : game.homeTeamName
                    }
                  </Text>
                  <Text style={styles.gameDate}>
                    {new Date(game.date).toLocaleDateString()} • {game.time}
                  </Text>
                  <Text style={styles.gameVenue}>{game.venue}</Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={colors.textSecondary}
                />
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Roster Preview */}
      <Card style={styles.card} mode="elevated">
        <Card.Title
          title="Roster"
          subtitle={`${team.players?.length || 0} Players`}
          right={(props) => (
            <Button mode="text" onPress={() => navigation.navigate('Roster', { teamId: team.id })}>
              View All
            </Button>
          )}
        />
        <Card.Content>
          {team.players?.slice(0, 5).map((player) => (
            <View key={player.id} style={styles.playerRow}>
              {player.photo ? (
                <Avatar.Image size={40} source={{ uri: player.photo }} />
              ) : (
                <Avatar.Text size={40} label={player.name.substring(0, 2)} />
              )}
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>
                  #{player.number} {player.name}
                </Text>
                {player.position && (
                  <Text style={styles.playerPosition}>{player.position}</Text>
                )}
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Team Stats */}
      <Card style={styles.card} mode="elevated">
        <Card.Title title="Season Statistics" />
        <Card.Content>
          <DataTable>
            <DataTable.Row>
              <DataTable.Cell>Games Played</DataTable.Cell>
              <DataTable.Cell numeric>{team.wins + team.losses}</DataTable.Cell>
            </DataTable.Row>
            <DataTable.Row>
              <DataTable.Cell>Points Per Game</DataTable.Cell>
              <DataTable.Cell numeric>
                {((team.pointsFor / (team.wins + team.losses)) || 0).toFixed(1)}
              </DataTable.Cell>
            </DataTable.Row>
            <DataTable.Row>
              <DataTable.Cell>Points Against Per Game</DataTable.Cell>
              <DataTable.Cell numeric>
                {((team.pointsAgainst / (team.wins + team.losses)) || 0).toFixed(1)}
              </DataTable.Cell>
            </DataTable.Row>
          </DataTable>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.h3,
    color: colors.error,
  },
  headerCard: {
    margin: spacing.md,
    backgroundColor: colors.primary,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  teamInfo: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  teamName: {
    ...typography.h2,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  division: {
    ...typography.body,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  coachName: {
    ...typography.bodySmall,
    color: colors.secondary,
    marginLeft: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  statLabel: {
    ...typography.caption,
    color: colors.secondary,
    marginTop: spacing.xs,
    opacity: 0.8,
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  gameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gameInfo: {
    flex: 1,
  },
  gameTeams: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  gameDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  gameVenue: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  playerInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  playerName: {
    ...typography.body,
    color: colors.text,
  },
  playerPosition: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});