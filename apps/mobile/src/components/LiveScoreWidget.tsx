import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LiveScore } from '@/types';
import { colors, spacing, typography } from '@/constants/theme';

interface LiveScoreWidgetProps {
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  liveScore: LiveScore;
  onPress?: () => void;
}

export const LiveScoreWidget: React.FC<LiveScoreWidgetProps> = ({
  gameId,
  homeTeamName,
  awayTeamName,
  liveScore,
  onPress,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulsing animation for live indicator
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Card style={styles.card} mode="elevated" onPress={onPress}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.liveIndicator}>
            <Animated.View
              style={[
                styles.liveDot,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Chip style={styles.quarterChip} textStyle={styles.quarterText}>
            Q{liveScore.quarter} • {liveScore.timeRemaining}
          </Chip>
        </View>

        <View style={styles.scoreContainer}>
          <View style={styles.teamScore}>
            <Text style={styles.teamName} numberOfLines={1}>
              {homeTeamName}
            </Text>
            <Text style={[
              styles.score,
              liveScore.homeScore > liveScore.awayScore && styles.winningScore
            ]}>
              {liveScore.homeScore}
            </Text>
            {liveScore.possession === 'home' && (
              <MaterialCommunityIcons
                name="basketball"
                size={20}
                color={colors.primary}
                style={styles.possessionIcon}
              />
            )}
          </View>

          <Text style={styles.vs}>VS</Text>

          <View style={styles.teamScore}>
            <Text style={styles.teamName} numberOfLines={1}>
              {awayTeamName}
            </Text>
            <Text style={[
              styles.score,
              liveScore.awayScore > liveScore.homeScore && styles.winningScore
            ]}>
              {liveScore.awayScore}
            </Text>
            {liveScore.possession === 'away' && (
              <MaterialCommunityIcons
                name="basketball"
                size={20}
                color={colors.primary}
                style={styles.possessionIcon}
              />
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.updateText}>
            Last update: {new Date(liveScore.lastUpdate).toLocaleTimeString()}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.live,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.live,
    marginRight: spacing.xs,
  },
  liveText: {
    ...typography.bodySmall,
    color: colors.live,
    fontWeight: 'bold',
  },
  quarterChip: {
    backgroundColor: colors.primary,
    height: 24,
  },
  quarterText: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  teamScore: {
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  score: {
    ...typography.h1,
    fontSize: 48,
    color: colors.text,
    fontWeight: 'bold',
  },
  winningScore: {
    color: colors.success,
  },
  possessionIcon: {
    position: 'absolute',
    bottom: -25,
  },
  vs: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  updateText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});