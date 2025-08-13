import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, Chip, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Game } from '@/types';
import { colors, spacing, typography } from '@/constants/theme';

interface GameCardProps {
  game: Game;
  onPress?: () => void;
  showLeague?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onPress, showLeague = true }) => {
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

  const getStatusIcon = () => {
    switch (game.status) {
      case 'live':
        return 'basketball';
      case 'upcoming':
        return 'clock-outline';
      case 'final':
        return 'check-circle';
      case 'cancelled':
        return 'close-circle';
      case 'postponed':
        return 'calendar-remove';
      default:
        return 'information';
    }
  };

  const formatTime = () => {
    if (game.status === 'live') {
      return `Q${game.quarter || 1} - ${game.timeRemaining || '0:00'}`;
    }
    return game.time;
  };

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          {/* Header with status and time */}
          <View style={styles.header}>
            <Chip
              icon={getStatusIcon()}
              style={[styles.statusChip, { backgroundColor: getStatusColor() }]}
              textStyle={styles.statusText}
            >
              {game.status.toUpperCase()}
            </Chip>
            <Text style={styles.timeText}>{formatTime()}</Text>
          </View>

          {/* Teams Section */}
          <View style={styles.teamsContainer}>
            {/* Home Team */}
            <View style={styles.teamRow}>
              <View style={styles.teamInfo}>
                {game.homeTeamLogo ? (
                  <Avatar.Image size={40} source={{ uri: game.homeTeamLogo }} />
                ) : (
                  <Avatar.Text size={40} label={game.homeTeamName.substring(0, 2)} />
                )}
                <View style={styles.teamDetails}>
                  <Text style={styles.teamName}>{game.homeTeamName}</Text>
                  <Text style={styles.teamLabel}>HOME</Text>
                </View>
              </View>
              <Text style={[styles.score, game.status === 'live' && game.homeTeamScore > game.awayTeamScore && styles.winningScore]}>
                {game.homeTeamScore}
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Away Team */}
            <View style={styles.teamRow}>
              <View style={styles.teamInfo}>
                {game.awayTeamLogo ? (
                  <Avatar.Image size={40} source={{ uri: game.awayTeamLogo }} />
                ) : (
                  <Avatar.Text size={40} label={game.awayTeamName.substring(0, 2)} />
                )}
                <View style={styles.teamDetails}>
                  <Text style={styles.teamName}>{game.awayTeamName}</Text>
                  <Text style={styles.teamLabel}>AWAY</Text>
                </View>
              </View>
              <Text style={[styles.score, game.status === 'live' && game.awayTeamScore > game.homeTeamScore && styles.winningScore]}>
                {game.awayTeamScore}
              </Text>
            </View>
          </View>

          {/* Footer with venue and league info */}
          <View style={styles.footer}>
            <View style={styles.venueInfo}>
              <MaterialCommunityIcons name="map-marker" size={16} color={colors.textSecondary} />
              <Text style={styles.venueText}>
                {game.venue} {game.court && `- Court ${game.court}`}
              </Text>
            </View>
            {showLeague && (
              <Text style={styles.leagueText}>
                {game.leagueName} • {game.division}
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: 'bold',
  },
  timeText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  teamsContainer: {
    marginVertical: spacing.sm,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
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
    ...typography.h4,
    color: colors.text,
  },
  teamLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  score: {
    ...typography.h1,
    color: colors.text,
    minWidth: 50,
    textAlign: 'right',
  },
  winningScore: {
    color: colors.success,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  venueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  venueText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  leagueText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});