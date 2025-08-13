import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, Avatar, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Team } from '@/types';
import { colors, spacing, typography } from '@/constants/theme';

interface TeamCardProps {
  team: Team;
  onPress?: () => void;
  showDivision?: boolean;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team, onPress, showDivision = true }) => {
  const winPercentage = team.wins + team.losses > 0
    ? ((team.wins / (team.wins + team.losses)) * 100).toFixed(1)
    : '0.0';

  const pointDifferential = team.pointsFor - team.pointsAgainst;

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.teamInfo}>
              {team.logo ? (
                <Avatar.Image size={56} source={{ uri: team.logo }} />
              ) : (
                <Avatar.Text size={56} label={team.name.substring(0, 2)} />
              )}
              <View style={styles.teamDetails}>
                <Text style={styles.teamName}>{team.name}</Text>
                {showDivision && (
                  <Text style={styles.divisionText}>
                    {team.division} • {team.ageGroup}
                  </Text>
                )}
                <Text style={styles.coachText}>
                  <MaterialCommunityIcons name="whistle" size={12} /> Coach {team.coachName}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{team.wins}-{team.losses}</Text>
              <Text style={styles.statLabel}>RECORD</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{winPercentage}%</Text>
              <Text style={styles.statLabel}>WIN %</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, pointDifferential > 0 ? styles.positive : styles.negative]}>
                {pointDifferential > 0 ? '+' : ''}{pointDifferential}
              </Text>
              <Text style={styles.statLabel}>DIFF</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerItem}>
              <MaterialCommunityIcons name="account-group" size={16} color={colors.textSecondary} />
              <Text style={styles.footerText}>{team.players?.length || 0} Players</Text>
            </View>
            <View style={styles.footerItem}>
              <MaterialCommunityIcons name="calendar" size={16} color={colors.textSecondary} />
              <Text style={styles.footerText}>{team.upcomingGames?.length || 0} Upcoming</Text>
            </View>
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
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  teamInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  teamDetails: {
    marginLeft: spacing.md,
    flex: 1,
  },
  teamName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  divisionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  coachText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.md,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
});