import type { Meta, StoryObj } from '@storybook/react';
import { ScoreCard } from '../src/components/ui/score-card';

const meta = {
  title: 'Game/ScoreCard',
  component: ScoreCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    gameStatus: {
      control: 'select',
      options: ['scheduled', 'live', 'final', 'postponed'],
    },
    variant: {
      control: 'select',
      options: ['default', 'compact', 'expanded'],
    },
    momentum: {
      control: { type: 'range', min: -100, max: 100 },
    },
  },
} satisfies Meta<typeof ScoreCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Base teams data
const suns = {
  id: 'phx-suns',
  name: 'Phoenix Suns',
  shortName: 'PHX',
  score: 96,
  color: '#FF9800',
  record: '10-2',
  fouls: 5,
  timeouts: 2,
  logo: '/logos/suns.svg',
};

const celtics = {
  id: 'bos-celtics',
  name: 'Boston Celtics',
  shortName: 'BOS',
  score: 102,
  color: '#008248',
  record: '11-1',
  fouls: 3,
  timeouts: 3,
  logo: '/logos/celtics.svg',
};

// Stories
export const LiveGame: Story = {
  args: {
    homeTeam: suns,
    awayTeam: celtics,
    gameStatus: 'live',
    period: 'Q3',
    timeRemaining: '5:47',
    momentum: -15,
    showDetails: true,
  },
};

export const ScheduledGame: Story = {
  args: {
    homeTeam: { ...suns, score: 0 },
    awayTeam: { ...celtics, score: 0 },
    gameStatus: 'scheduled',
    showDetails: false,
  },
};

export const FinalGame: Story = {
  args: {
    homeTeam: { ...suns, score: 110 },
    awayTeam: { ...celtics, score: 98 },
    gameStatus: 'final',
    showDetails: true,
  },
};

export const CompactVariant: Story = {
  args: {
    homeTeam: suns,
    awayTeam: celtics,
    gameStatus: 'live',
    period: 'Q3',
    timeRemaining: '5:47',
    variant: 'compact',
    showDetails: false,
  },
};

export const ExpandedVariant: Story = {
  args: {
    homeTeam: suns,
    awayTeam: celtics,
    gameStatus: 'live',
    period: 'Q4',
    timeRemaining: '1:23',
    momentum: 25,
    variant: 'expanded',
    showDetails: true,
  },
};

export const CloseGame: Story = {
  args: {
    homeTeam: { ...suns, score: 88 },
    awayTeam: { ...celtics, score: 89 },
    gameStatus: 'live',
    period: 'Q4',
    timeRemaining: '0:47',
    momentum: 5,
    showDetails: true,
  },
};

export const Overtime: Story = {
  args: {
    homeTeam: { ...suns, score: 112 },
    awayTeam: { ...celtics, score: 112 },
    gameStatus: 'live',
    period: 'OT',
    timeRemaining: '3:15',
    momentum: 0,
    showDetails: true,
  },
};

export const NoLogos: Story = {
  args: {
    homeTeam: {
      id: 'home',
      name: 'Home Team',
      score: 75,
      record: '5-5',
    },
    awayTeam: {
      id: 'away',
      name: 'Away Team',
      score: 82,
      record: '6-4',
    },
    gameStatus: 'live',
    period: 'Q3',
    timeRemaining: '8:30',
    showDetails: true,
  },
};

export const PostponedGame: Story = {
  args: {
    homeTeam: { ...suns, score: 0 },
    awayTeam: { ...celtics, score: 0 },
    gameStatus: 'postponed',
    showDetails: false,
  },
};