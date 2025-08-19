import type { Meta, StoryObj } from '@storybook/react';
import { BoxScoreTable } from '../src/components/ui/box-score-table';

const meta = {
  title: 'Game/BoxScoreTable',
  component: BoxScoreTable,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['compact', 'standard', 'expanded'],
    },
    density: {
      control: 'select',
      options: ['compact', 'comfortable', 'spacious'],
    },
  },
} satisfies Meta<typeof BoxScoreTable>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample player data
const mockPlayers = [
  {
    id: '1',
    number: '3',
    name: 'Chris Paul',
    position: 'PG',
    isStarter: true,
    minutes: 36,
    points: 28,
    rebounds: 7,
    assists: 14,
    steals: 3,
    blocks: 0,
    turnovers: 2,
    fouls: 2,
    plusMinus: 12,
    fg: { made: 10, attempted: 18 },
    threePt: { made: 4, attempted: 8 },
    ft: { made: 4, attempted: 4 },
  },
  {
    id: '2',
    number: '1',
    name: 'Devin Booker',
    position: 'SG',
    isStarter: true,
    minutes: 38,
    points: 35,
    rebounds: 5,
    assists: 6,
    steals: 1,
    blocks: 1,
    turnovers: 3,
    fouls: 3,
    plusMinus: 8,
    fg: { made: 12, attempted: 22 },
    threePt: { made: 3, attempted: 7 },
    ft: { made: 8, attempted: 9 },
  },
  {
    id: '3',
    number: '35',
    name: 'Kevin Durant',
    position: 'SF',
    isStarter: true,
    minutes: 40,
    points: 31,
    rebounds: 8,
    assists: 4,
    steals: 2,
    blocks: 2,
    turnovers: 4,
    fouls: 2,
    plusMinus: 15,
    fg: { made: 11, attempted: 20 },
    threePt: { made: 2, attempted: 5 },
    ft: { made: 7, attempted: 8 },
  },
  {
    id: '4',
    number: '22',
    name: 'Deandre Ayton',
    position: 'C',
    isStarter: true,
    minutes: 32,
    points: 18,
    rebounds: 12,
    assists: 2,
    steals: 0,
    blocks: 3,
    turnovers: 1,
    fouls: 4,
    plusMinus: 10,
    fg: { made: 8, attempted: 12 },
    threePt: { made: 0, attempted: 0 },
    ft: { made: 2, attempted: 4 },
  },
  {
    id: '5',
    number: '99',
    name: 'Jae Crowder',
    position: 'PF',
    isStarter: true,
    minutes: 28,
    points: 8,
    rebounds: 6,
    assists: 1,
    steals: 1,
    blocks: 0,
    turnovers: 0,
    fouls: 3,
    plusMinus: 5,
    fg: { made: 3, attempted: 8 },
    threePt: { made: 2, attempted: 6 },
    ft: { made: 0, attempted: 0 },
  },
  // Bench players
  {
    id: '6',
    number: '14',
    name: 'Landry Shamet',
    position: 'SG',
    isStarter: false,
    minutes: 18,
    points: 12,
    rebounds: 2,
    assists: 1,
    steals: 0,
    blocks: 0,
    turnovers: 1,
    fouls: 1,
    plusMinus: -3,
    fg: { made: 4, attempted: 9 },
    threePt: { made: 3, attempted: 7 },
    ft: { made: 1, attempted: 2 },
  },
  {
    id: '7',
    number: '23',
    name: 'Cameron Johnson',
    position: 'SF',
    isStarter: false,
    minutes: 22,
    points: 9,
    rebounds: 4,
    assists: 2,
    steals: 1,
    blocks: 0,
    turnovers: 0,
    fouls: 2,
    plusMinus: 2,
    fg: { made: 3, attempted: 6 },
    threePt: { made: 2, attempted: 4 },
    ft: { made: 1, attempted: 2 },
  },
  {
    id: '8',
    number: '8',
    name: 'Frank Kaminsky',
    position: 'C',
    isStarter: false,
    minutes: 12,
    points: 6,
    rebounds: 3,
    assists: 3,
    steals: 0,
    blocks: 1,
    turnovers: 2,
    fouls: 3,
    plusMinus: -5,
    fg: { made: 2, attempted: 5 },
    threePt: { made: 1, attempted: 3 },
    ft: { made: 1, attempted: 2 },
  },
];

const teamTotals = {
  minutes: 240,
  points: 147,
  rebounds: 47,
  assists: 33,
  steals: 8,
  blocks: 7,
  turnovers: 13,
  fouls: 20,
  fg: { made: 53, attempted: 108 },
  threePt: { made: 17, attempted: 42 },
  ft: { made: 24, attempted: 31 },
};

// Stories
export const Default: Story = {
  args: {
    teamName: 'Phoenix Suns',
    teamLogo: '/logos/suns.svg',
    teamColor: '#FF9800',
    players: mockPlayers,
    teamTotals,
    variant: 'standard',
    density: 'comfortable',
    sortable: true,
    showBench: true,
  },
};

export const CompactView: Story = {
  args: {
    teamName: 'Phoenix Suns',
    teamColor: '#FF9800',
    players: mockPlayers,
    teamTotals,
    variant: 'compact',
    density: 'compact',
    sortable: false,
    showBench: false,
  },
};

export const ExpandedView: Story = {
  args: {
    teamName: 'Phoenix Suns',
    teamLogo: '/logos/suns.svg',
    teamColor: '#FF9800',
    players: mockPlayers,
    teamTotals,
    variant: 'expanded',
    density: 'spacious',
    sortable: true,
    showBench: true,
  },
};

export const HighlightedPlayer: Story = {
  args: {
    teamName: 'Phoenix Suns',
    teamLogo: '/logos/suns.svg',
    teamColor: '#FF9800',
    players: mockPlayers,
    teamTotals,
    variant: 'standard',
    density: 'comfortable',
    highlightPlayer: '2', // Highlight Devin Booker
    sortable: true,
    showBench: true,
  },
};

export const NoLogo: Story = {
  args: {
    teamName: 'Home Team',
    players: mockPlayers,
    teamTotals,
    variant: 'standard',
    density: 'comfortable',
  },
};

export const CustomColumns: Story = {
  args: {
    teamName: 'Phoenix Suns',
    teamColor: '#FF9800',
    players: mockPlayers,
    teamTotals,
    columns: [
      { key: 'name', label: 'PLAYER', align: 'left' },
      { key: 'points', label: 'PTS', align: 'center' },
      { key: 'fg', label: 'FG', align: 'center', 
        format: (v: any) => `${v.made}/${v.attempted}` },
      { key: 'threePt', label: '3PT', align: 'center',
        format: (v: any) => `${v.made}/${v.attempted}` },
      { key: 'ft', label: 'FT', align: 'center',
        format: (v: any) => `${v.made}/${v.attempted}` },
    ],
  },
};

export const MobileResponsive: Story = {
  args: {
    teamName: 'Phoenix Suns',
    teamColor: '#FF9800',
    players: mockPlayers.slice(0, 5), // Just starters for mobile
    teamTotals,
    variant: 'compact',
    density: 'compact',
    sortable: false,
    showBench: false,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
};

export const DenseData: Story = {
  args: {
    teamName: 'Phoenix Suns',
    teamLogo: '/logos/suns.svg',
    teamColor: '#FF9800',
    players: [...mockPlayers, ...mockPlayers.map(p => ({
      ...p,
      id: `${p.id}-2`,
      name: `${p.name} Jr.`,
      isStarter: false,
    }))],
    teamTotals,
    variant: 'standard',
    density: 'compact',
    sortable: true,
    showBench: true,
  },
};