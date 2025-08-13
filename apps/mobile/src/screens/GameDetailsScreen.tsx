import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Button, Chip, Avatar, DataTable } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { LiveScoreWidget } from '@/components/LiveScoreWidget';
import { colors, spacing, typography } from '@/constants/theme';

export default function GameDetailsScreen() {
  const route = useRoute<any>();
  const { gameId } = route.params;
  
  const game = useSelector((state: RootState) =>
    state.games.games.find(g => g.id === gameId)
  );
  const liveScore = useSelector((state: RootState) =>
    state.games.liveScores[gameId]
  );

  if (!game) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Game not found</Text>
      </View>
    );
  }

  const getStatusColor = () => {
    switch (game.status) {
      case 'live':
        return colors.live;
      case 'upcoming':
        return colors.upcoming;
      case 'final':
        return colors.final;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Live Score Widget for live games */}
      {game.status === 'live' && liveScore && (
        <LiveScoreWidget
          gameId={game.id}
          homeTeamName={game.homeTeamName}
          awayTeamName={game.awayTeamName}
          liveScore={liveScore}
        />
      )}

      {/* Game Status Card */}
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={styles.statusRow}>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor() }]}
              textStyle={styles.statusText}
            >
              {game.status.toUpperCase()}
            </Chip>
            <Text style={styles.dateTime}>
              {new Date(game.date).toLocaleDateString()} • {game.time}
            </Text>
          </View>

          {/* Teams Score Display */}
          <View style={styles.teamsContainer}>
            <View style={styles.teamBox}>
              {game.homeTeamLogo ? (
                <Avatar.Image size={64} source={{ uri: game.homeTeamLogo }} />
              ) : (
                <Avatar.Text size={64} label={game.homeTeamName.substring(0, 2)} />
              )}
              <Text style={styles.teamName}>{game.homeTeamName}</Text>
              <Text style={styles.teamLabel}>HOME</Text>
              <Text style={styles.score}>{game.homeTeamScore}</Text>
            </View>

            <View style={styles.vsContainer}>
              <Text style={styles.vs}>VS</Text>
              {game.status === 'live' && (
                <Text style={styles.quarter}>Q{game.quarter || 1}</Text>
              )}
            </View>

            <View style={styles.teamBox}>
              {game.awayTeamLogo ? (
                <Avatar.Image size={64} source={{ uri: game.awayTeamLogo }} />
              ) : (
                <Avatar.Text size={64} label={game.awayTeamName.substring(0, 2)} />
              )}
              <Text style={styles.teamName}>{game.awayTeamName}</Text>
              <Text style={styles.teamLabel}>AWAY</Text>
              <Text style={styles.score}>{game.awayTeamScore}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Game Info Card */}
      <Card style={styles.card} mode="elevated">
        <Card.Title title="Game Information" />
        <Card.Content>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={20} color={colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Venue</Text>
              <Text style={styles.infoValue}>
                {game.venue} {game.court && `• Court ${game.court}`}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="trophy" size={20} color={colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>League</Text>
              <Text style={styles.infoValue}>{game.leagueName}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="basketball" size={20} color={colors.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Division</Text>
              <Text style={styles.infoValue}>{game.division}</Text>
            </View>
          </View>

          {game.refereeName && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="whistle" size={20} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Referee</Text>
                <Text style={styles.infoValue}>{game.refereeName}</Text>
              </View>
            </View>
          )}

          {game.scorekeeperName && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="clipboard-text" size={20} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Scorekeeper</Text>
                <Text style={styles.infoValue}>{game.scorekeeperName}</Text>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="contained-tonal"
          icon="directions"
          onPress={() => {}}
          style={styles.actionButton}
        >
          Get Directions
        </Button>
        <Button
          mode="contained-tonal"
          icon="share"
          onPress={() => {}}
          style={styles.actionButton}
        >
          Share Game
        </Button>
      </View>

      {/* Team Rosters Quick View */}
      <Card style={styles.card} mode="elevated">
        <Card.Title title="Team Rosters" />
        <Card.Content>
          <Button
            mode="text"
            onPress={() => {}}
            contentStyle={styles.rosterButton}
          >
            View {game.homeTeamName} Roster
          </Button>
          <Button
            mode="text"
            onPress={() => {}}
            contentStyle={styles.rosterButton}
          >
            View {game.awayTeamName} Roster
          </Button>
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
  card: {
    margin: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusChip: {
    paddingHorizontal: spacing.md,
  },
  statusText: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 12,
  },
  dateTime: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  teamsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  teamBox: {
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  teamLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  score: {
    ...typography.h1,
    color: colors.text,
    fontWeight: 'bold',
    marginTop: spacing.sm,
  },
  vsContainer: {
    alignItems: 'center',
  },
  vs: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  quarter: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.xs,
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
  rosterButton: {
    justifyContent: 'flex-start',
  },
});