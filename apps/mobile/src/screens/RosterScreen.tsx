import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Text, Avatar, Chip } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { colors, spacing, typography } from '@/constants/theme';
import { Player } from '@/types';

export default function RosterScreen() {
  const route = useRoute<any>();
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

  const renderPlayer = ({ item }: { item: Player }) => (
    <Card style={styles.playerCard} mode="elevated">
      <Card.Content style={styles.playerContent}>
        <View style={styles.playerLeft}>
          {item.photo ? (
            <Avatar.Image size={56} source={{ uri: item.photo }} />
          ) : (
            <Avatar.Text size={56} label={item.name.substring(0, 2)} />
          )}
          <View style={styles.playerInfo}>
            <Text style={styles.playerNumber}>#{item.number}</Text>
            <Text style={styles.playerName}>{item.name}</Text>
            {item.position && (
              <Chip style={styles.positionChip} textStyle={styles.positionText}>
                {item.position}
              </Chip>
            )}
          </View>
        </View>
        
        {item.stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.stats.points}</Text>
              <Text style={styles.statLabel}>PTS</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.stats.rebounds}</Text>
              <Text style={styles.statLabel}>REB</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.stats.assists}</Text>
              <Text style={styles.statLabel}>AST</Text>
            </View>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={team.players}
        renderItem={renderPlayer}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No players in roster</Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.h3,
    color: colors.error,
  },
  listContent: {
    padding: spacing.md,
  },
  playerCard: {
    marginBottom: spacing.md,
  },
  playerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  playerNumber: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  playerName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  positionChip: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    height: 24,
  },
  positionText: {
    fontSize: 10,
  },
  statsContainer: {
    flexDirection: 'row',
  },
  statItem: {
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  statValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: 'bold',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});