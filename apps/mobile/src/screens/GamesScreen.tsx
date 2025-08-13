import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Searchbar, SegmentedButtons, FAB, Portal, Modal, RadioButton, Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { GameCard } from '@/components/GameCard';
import { colors, spacing, typography } from '@/constants/theme';
import { Game } from '@/types';

export default function GamesScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  
  const { games, liveGames, upcomingGames, completedGames, isLoading } = useSelector(
    (state: RootState) => state.games
  );
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [filteredGames, setFilteredGames] = useState<Game[]>(games);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedLeague, setSelectedLeague] = useState('all');

  useEffect(() => {
    filterGames();
  }, [searchQuery, selectedStatus, selectedDivision, selectedLeague, games, liveGames, upcomingGames, completedGames]);

  const filterGames = () => {
    let filtered: Game[] = [];
    
    // Filter by status
    switch (selectedStatus) {
      case 'live':
        filtered = liveGames;
        break;
      case 'upcoming':
        filtered = upcomingGames;
        break;
      case 'completed':
        filtered = completedGames;
        break;
      default:
        filtered = games;
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        game =>
          game.homeTeamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          game.awayTeamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          game.venue.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by division
    if (selectedDivision !== 'all') {
      filtered = filtered.filter(game => game.division === selectedDivision);
    }
    
    // Filter by league
    if (selectedLeague !== 'all') {
      filtered = filtered.filter(game => game.leagueId === selectedLeague);
    }
    
    setFilteredGames(filtered);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // TODO: Fetch latest games
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const renderGame = ({ item }: { item: Game }) => (
    <GameCard
      game={item}
      onPress={() => navigation.navigate('GameDetails', { gameId: item.id })}
    />
  );

  const getUniqueValues = (key: keyof Game) => {
    const values = new Set(games.map(game => game[key]));
    return Array.from(values);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search games..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <SegmentedButtons
          value={selectedStatus}
          onValueChange={setSelectedStatus}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'live', label: `Live (${liveGames.length})` },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'completed', label: 'Final' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <FlatList
        data={filteredGames}
        renderItem={renderGame}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No games found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        }
      />

      <FAB
        icon="filter"
        style={styles.fab}
        onPress={() => setFilterModalVisible(true)}
        label="Filter"
      />

      <Portal>
        <Modal
          visible={filterModalVisible}
          onDismiss={() => setFilterModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.modalTitle}>Filter Games</Text>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Division</Text>
            <RadioButton.Group
              onValueChange={value => setSelectedDivision(value)}
              value={selectedDivision}
            >
              <RadioButton.Item label="All Divisions" value="all" />
              {getUniqueValues('division').map(division => (
                <RadioButton.Item
                  key={division as string}
                  label={division as string}
                  value={division as string}
                />
              ))}
            </RadioButton.Group>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>League</Text>
            <RadioButton.Group
              onValueChange={value => setSelectedLeague(value)}
              value={selectedLeague}
            >
              <RadioButton.Item label="All Leagues" value="all" />
              {getUniqueValues('leagueId').map(leagueId => (
                <RadioButton.Item
                  key={leagueId as string}
                  label={`League ${leagueId}`}
                  value={leagueId as string}
                />
              ))}
            </RadioButton.Group>
          </View>
          
          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => {
                setSelectedDivision('all');
                setSelectedLeague('all');
              }}
            >
              Clear All
            </Button>
            <Button
              mode="contained"
              onPress={() => setFilterModalVisible(false)}
            >
              Apply
            </Button>
          </View>
        </Modal>
      </Portal>
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
  segmentedButtons: {
    marginBottom: spacing.sm,
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
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
  modalContent: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: 8,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterLabel: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
});