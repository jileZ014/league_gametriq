import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Searchbar, Chip, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { TeamCard } from '@/components/TeamCard';
import { colors, spacing, typography } from '@/constants/theme';
import { Team } from '@/types';

export default function TeamsScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  
  const { teams, myTeams, isLoading } = useSelector((state: RootState) => state.teams);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'my'>('all');
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>(teams);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    filterTeams();
  }, [searchQuery, selectedFilter, selectedDivision, teams, myTeams]);

  const filterTeams = () => {
    let filtered = selectedFilter === 'my' ? myTeams : teams;
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.coachName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.division.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by division
    if (selectedDivision) {
      filtered = filtered.filter(team => team.division === selectedDivision);
    }
    
    // Sort by win percentage
    filtered.sort((a, b) => {
      const aWinPct = a.wins / (a.wins + a.losses) || 0;
      const bWinPct = b.wins / (b.wins + b.losses) || 0;
      return bWinPct - aWinPct;
    });
    
    setFilteredTeams(filtered);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // TODO: Fetch latest teams
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const renderTeam = ({ item }: { item: Team }) => (
    <TeamCard
      team={item}
      onPress={() => navigation.navigate('TeamDetails', { teamId: item.id })}
    />
  );

  const getDivisions = () => {
    const divisions = new Set(teams.map(team => team.division));
    return Array.from(divisions);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search teams..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            <Chip
              selected={selectedFilter === 'all'}
              onPress={() => setSelectedFilter('all')}
              style={styles.filterChip}
            >
              All Teams ({teams.length})
            </Chip>
            {myTeams.length > 0 && (
              <Chip
                selected={selectedFilter === 'my'}
                onPress={() => setSelectedFilter('my')}
                style={styles.filterChip}
              >
                My Teams ({myTeams.length})
              </Chip>
            )}
          </View>
          
          <View style={styles.divisionRow}>
            <Chip
              selected={!selectedDivision}
              onPress={() => setSelectedDivision(null)}
              style={styles.divisionChip}
            >
              All Divisions
            </Chip>
            {getDivisions().map(division => (
              <Chip
                key={division}
                selected={selectedDivision === division}
                onPress={() => setSelectedDivision(division === selectedDivision ? null : division)}
                style={styles.divisionChip}
              >
                {division}
              </Chip>
            ))}
          </View>
        </View>
      </View>

      <FlatList
        data={filteredTeams}
        renderItem={renderTeam}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No teams found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
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
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    marginBottom: spacing.md,
    elevation: 0,
    backgroundColor: colors.background,
  },
  filterContainer: {
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  filterChip: {
    marginRight: spacing.sm,
  },
  divisionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  divisionChip: {
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  listContent: {
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
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