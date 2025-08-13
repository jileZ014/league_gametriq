import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { DataTable, SegmentedButtons, Text, Avatar, Chip } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { colors, spacing, typography } from '@/constants/theme';
import { Standing } from '@/types';

export default function StandingsScreen() {
  const { divisionStandings, isLoading } = useSelector((state: RootState) => state.standings);
  const [selectedDivision, setSelectedDivision] = useState<string>(
    Object.keys(divisionStandings)[0] || 'all'
  );
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // TODO: Fetch latest standings
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const renderStandingsTable = (standings: Standing[]) => (
    <DataTable style={styles.table}>
      <DataTable.Header>
        <DataTable.Title style={styles.rankColumn}>#</DataTable.Title>
        <DataTable.Title style={styles.teamColumn}>Team</DataTable.Title>
        <DataTable.Title numeric>W</DataTable.Title>
        <DataTable.Title numeric>L</DataTable.Title>
        <DataTable.Title numeric>PCT</DataTable.Title>
        <DataTable.Title numeric>GB</DataTable.Title>
        <DataTable.Title numeric>DIFF</DataTable.Title>
      </DataTable.Header>

      {standings.map((standing, index) => (
        <DataTable.Row key={standing.teamId}>
          <DataTable.Cell style={styles.rankColumn}>
            <View style={styles.rankContainer}>
              {standing.rank <= 3 && (
                <View
                  style={[
                    styles.rankBadge,
                    standing.rank === 1 && styles.firstPlace,
                    standing.rank === 2 && styles.secondPlace,
                    standing.rank === 3 && styles.thirdPlace,
                  ]}
                />
              )}
              <Text style={styles.rankText}>{standing.rank}</Text>
            </View>
          </DataTable.Cell>
          <DataTable.Cell style={styles.teamColumn}>
            <View style={styles.teamCell}>
              {standing.teamLogo ? (
                <Avatar.Image size={24} source={{ uri: standing.teamLogo }} />
              ) : (
                <Avatar.Text size={24} label={standing.teamName.substring(0, 2)} />
              )}
              <Text style={styles.teamName} numberOfLines={1}>
                {standing.teamName}
              </Text>
            </View>
          </DataTable.Cell>
          <DataTable.Cell numeric>
            <Text style={styles.statText}>{standing.wins}</Text>
          </DataTable.Cell>
          <DataTable.Cell numeric>
            <Text style={styles.statText}>{standing.losses}</Text>
          </DataTable.Cell>
          <DataTable.Cell numeric>
            <Text style={styles.statText}>{standing.winPercentage.toFixed(3)}</Text>
          </DataTable.Cell>
          <DataTable.Cell numeric>
            <Text style={styles.statText}>
              {standing.gamesBack > 0 ? standing.gamesBack.toFixed(1) : '-'}
            </Text>
          </DataTable.Cell>
          <DataTable.Cell numeric>
            <Text
              style={[
                styles.statText,
                standing.pointDifferential > 0 ? styles.positive : styles.negative,
              ]}
            >
              {standing.pointDifferential > 0 ? '+' : ''}
              {standing.pointDifferential}
            </Text>
          </DataTable.Cell>
        </DataTable.Row>
      ))}
    </DataTable>
  );

  const divisions = Object.keys(divisionStandings);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {divisions.length > 1 && (
        <View style={styles.header}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <SegmentedButtons
              value={selectedDivision}
              onValueChange={setSelectedDivision}
              buttons={divisions.map(division => ({
                value: division,
                label: division,
              }))}
              style={styles.segmentedButtons}
            />
          </ScrollView>
        </View>
      )}

      {divisionStandings[selectedDivision] ? (
        <View style={styles.content}>
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.firstPlace]} />
              <Text style={styles.legendText}>1st Place</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.secondPlace]} />
              <Text style={styles.legendText}>2nd Place</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.thirdPlace]} />
              <Text style={styles.legendText}>3rd Place</Text>
            </View>
          </View>

          {renderStandingsTable(divisionStandings[selectedDivision])}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              W = Wins • L = Losses • PCT = Win Percentage
            </Text>
            <Text style={styles.footerText}>
              GB = Games Behind • DIFF = Point Differential
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No standings available</Text>
          <Text style={styles.emptySubtext}>Check back later for updated standings</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segmentedButtons: {
    minWidth: '100%',
  },
  content: {
    padding: spacing.md,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  legendText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  table: {
    backgroundColor: colors.background,
    borderRadius: 8,
    overflow: 'hidden',
  },
  rankColumn: {
    flex: 0.5,
  },
  teamColumn: {
    flex: 2,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: spacing.xs,
  },
  firstPlace: {
    backgroundColor: colors.primary,
  },
  secondPlace: {
    backgroundColor: '#c0c0c0',
  },
  thirdPlace: {
    backgroundColor: '#cd7f32',
  },
  rankText: {
    ...typography.body,
    color: colors.text,
    fontWeight: 'bold',
  },
  teamCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamName: {
    ...typography.bodySmall,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  statText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  positive: {
    color: colors.success,
    fontWeight: 'bold',
  },
  negative: {
    color: colors.error,
  },
  footer: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  footerText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
  },
});