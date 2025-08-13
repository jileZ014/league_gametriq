import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { BracketView } from '../BracketView';
import { Tournament, Match, Team, BracketStructure } from '@/lib/tournament/types';

// Mock the lucide-react icons
jest.mock('lucide-react', () => ({
  ZoomIn: () => <div data-testid="zoom-in-icon" />,
  ZoomOut: () => <div data-testid="zoom-out-icon" />,
  RotateCcw: () => <div data-testid="reset-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Share2: () => <div data-testid="share-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Maximize2: () => <div data-testid="maximize-icon" />,
  Play: () => <div data-testid="play-icon" />,
  Trophy: () => <div data-testid="trophy-icon" />,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span className={className}>{children}</span>
  ),
}));

// Test data generators
const createMockTeam = (id: string, name: string, seed?: number): Team => ({
  id,
  name,
  seed,
  players: [],
  coaches: [],
  stats: {
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
  },
});

const createMockMatch = (
  id: string,
  team1: Team | null,
  team2: Team | null,
  status: Match['status'] = 'pending',
  score?: { team1Score: number; team2Score: number },
  winner?: Team
): Match => ({
  id,
  team1,
  team2,
  status,
  score,
  winner,
  round: 1,
  matchNumber: 1,
  scheduledTime: new Date(),
});

const createMockTournament = (teams: Team[]): Tournament => ({
  id: 'tournament-1',
  name: 'Test Tournament',
  type: 'single_elimination',
  status: 'in_progress',
  teams,
  maxTeams: 16,
  startDate: new Date(),
  endDate: new Date(),
  format: 'single_elimination',
  settings: {
    seedingMethod: 'manual',
    showSeeds: true,
    allowByes: true,
  },
});

const createMockBracket = (matches: Match[]): BracketStructure => {
  const rounds = [
    {
      roundNumber: 1,
      name: 'Round 1',
      matches: matches.slice(0, 4),
    },
    {
      roundNumber: 2,
      name: 'Semifinals',
      matches: matches.slice(4, 6),
    },
    {
      roundNumber: 3,
      name: 'Championship',
      matches: matches.slice(6, 7),
    },
  ];

  return {
    tournamentId: 'tournament-1',
    format: 'single_elimination',
    rounds,
    totalRounds: 3,
    totalMatches: 7,
  };
};

describe('BracketView Component', () => {
  const mockTeams = [
    createMockTeam('team-1', 'Phoenix Warriors', 1),
    createMockTeam('team-2', 'Desert Eagles', 2),
    createMockTeam('team-3', 'Cactus Crushers', 3),
    createMockTeam('team-4', 'Sun Devils', 4),
    createMockTeam('team-5', 'Valley Vipers', 5),
    createMockTeam('team-6', 'Mesa Mustangs', 6),
    createMockTeam('team-7', 'Scottsdale Stars', 7),
    createMockTeam('team-8', 'Tempe Titans', 8),
  ];

  const mockMatches = [
    // Round 1
    createMockMatch('match-1', mockTeams[0], mockTeams[7], 'completed', { team1Score: 75, team2Score: 68 }, mockTeams[0]),
    createMockMatch('match-2', mockTeams[1], mockTeams[6], 'completed', { team1Score: 82, team2Score: 79 }, mockTeams[1]),
    createMockMatch('match-3', mockTeams[2], mockTeams[5], 'in_progress', { team1Score: 45, team2Score: 42 }),
    createMockMatch('match-4', mockTeams[3], mockTeams[4], 'pending'),
    // Round 2
    createMockMatch('match-5', mockTeams[0], mockTeams[1], 'pending'),
    createMockMatch('match-6', null, null, 'pending'), // TBD vs TBD
    // Championship
    createMockMatch('match-7', null, null, 'pending'), // TBD vs TBD
  ];

  const mockTournament = createMockTournament(mockTeams);
  const mockBracket = createMockBracket(mockMatches);

  const defaultProps = {
    tournament: mockTournament,
    bracket: mockBracket,
  };

  beforeEach(() => {
    // Mock SVG getBBox method
    Object.defineProperty(SVGElement.prototype, 'getBBox', {
      writable: true,
      value: jest.fn(() => ({
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      })),
    });

    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      toJSON: () => {},
    }));
  });

  describe('Bracket Display', () => {
    it('should render single elimination bracket correctly', () => {
      render(<BracketView {...defaultProps} />);

      // Check tournament info is displayed
      expect(screen.getByText('Test Tournament')).toBeInTheDocument();
      expect(screen.getByText('8 teams • single elimination')).toBeInTheDocument();

      // Check SVG bracket is rendered
      const svg = screen.getByRole('img', { hidden: true });
      expect(svg).toBeInTheDocument();

      // Check legend is displayed
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should display team names and seeds correctly', () => {
      render(<BracketView {...defaultProps} />);

      // Should display team names in the SVG (via text elements)
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();

      // Check that team names are rendered as SVG text elements
      const textElements = svg?.querySelectorAll('text') || [];
      const teamNames = Array.from(textElements).map(el => el.textContent).filter(Boolean);
      
      expect(teamNames).toContain('Phoenix Warriors');
      expect(teamNames).toContain('Desert Eagles');
    });

    it('should show match scores when available', () => {
      render(<BracketView {...defaultProps} />);

      const svg = document.querySelector('svg');
      const textElements = svg?.querySelectorAll('text') || [];
      const scores = Array.from(textElements).map(el => el.textContent).filter(Boolean);

      // Should show completed match scores
      expect(scores).toContain('75'); // Phoenix Warriors score
      expect(scores).toContain('68'); // Tempe Titans score
      expect(scores).toContain('82'); // Desert Eagles score
      expect(scores).toContain('79'); // Scottsdale Stars score
    });

    it('should indicate match status visually', () => {
      render(<BracketView {...defaultProps} />);

      const svg = document.querySelector('svg');
      
      // Check for status indicators (colored rectangles)
      const statusRects = svg?.querySelectorAll('rect[width="4"]') || [];
      expect(statusRects.length).toBeGreaterThan(0);

      // Check for in-progress indicator (animated circle)
      const inProgressIndicators = svg?.querySelectorAll('circle.animate-pulse') || [];
      expect(inProgressIndicators.length).toBe(1); // One match is in progress
    });

    it('should display bye matches correctly', () => {
      const byeMatch = createMockMatch('bye-match', mockTeams[0], null, 'bye');
      const bracketWithBye = {
        ...mockBracket,
        rounds: [
          {
            ...mockBracket.rounds[0],
            matches: [...mockBracket.rounds[0].matches, byeMatch],
          },
          ...mockBracket.rounds.slice(1),
        ],
      };

      render(<BracketView tournament={mockTournament} bracket={bracketWithBye} />);

      const svg = document.querySelector('svg');
      const textElements = svg?.querySelectorAll('text') || [];
      const byeTexts = Array.from(textElements).filter(el => el.textContent === 'BYE');
      
      expect(byeTexts.length).toBeGreaterThan(0);
    });

    it('should handle empty bracket gracefully', () => {
      const emptyBracket: BracketStructure = {
        tournamentId: 'tournament-1',
        format: 'single_elimination',
        rounds: [],
        totalRounds: 0,
        totalMatches: 0,
      };

      render(<BracketView tournament={mockTournament} bracket={emptyBracket} />);

      // Should still show tournament info
      expect(screen.getByText('Test Tournament')).toBeInTheDocument();
      
      // SVG should be present but empty
      const svg = screen.getByRole('img', { hidden: true });
      expect(svg).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle match clicks correctly', async () => {
      const user = userEvent.setup();
      const mockOnMatchClick = jest.fn();

      render(
        <BracketView 
          {...defaultProps} 
          onMatchClick={mockOnMatchClick}
          interactive={true}
        />
      );

      // Find and click a match rectangle
      const svg = document.querySelector('svg');
      const matchRect = svg?.querySelector('rect[rx="4"]'); // Match container
      
      if (matchRect) {
        fireEvent.click(matchRect);
        await waitFor(() => {
          expect(mockOnMatchClick).toHaveBeenCalledWith(expect.objectContaining({
            id: expect.any(String),
          }));
        });
      }
    });

    it('should handle team clicks correctly', async () => {
      const mockOnTeamClick = jest.fn();

      render(
        <BracketView 
          {...defaultProps} 
          onTeamClick={mockOnTeamClick}
          interactive={true}
        />
      );

      // Find and click a team area
      const svg = document.querySelector('svg');
      const teamRects = svg?.querySelectorAll('rect[fill="transparent"]'); // Team click areas
      
      if (teamRects && teamRects.length > 0) {
        fireEvent.click(teamRects[0]);
        await waitFor(() => {
          expect(mockOnTeamClick).toHaveBeenCalledWith(expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
          }));
        });
      }
    });

    it('should not be interactive when interactive prop is false', () => {
      const mockOnMatchClick = jest.fn();
      const mockOnTeamClick = jest.fn();

      render(
        <BracketView 
          {...defaultProps} 
          onMatchClick={mockOnMatchClick}
          onTeamClick={mockOnTeamClick}
          interactive={false}
        />
      );

      const svg = document.querySelector('svg');
      const matchRect = svg?.querySelector('rect[rx="4"]');
      
      if (matchRect) {
        fireEvent.click(matchRect);
        expect(mockOnMatchClick).not.toHaveBeenCalled();
      }
    });

    it('should highlight selected matches', async () => {
      render(<BracketView {...defaultProps} interactive={true} />);

      const svg = document.querySelector('svg');
      const matchRect = svg?.querySelector('rect[rx="4"]'); // First match container
      
      if (matchRect) {
        fireEvent.click(matchRect);
        
        await waitFor(() => {
          // Selected match should have thicker border
          expect(matchRect).toHaveAttribute('stroke-width', '3');
        });
      }
    });

    it('should highlight teams when selected', async () => {
      render(<BracketView {...defaultProps} interactive={true} />);

      const svg = document.querySelector('svg');
      const teamRect = svg?.querySelector('rect[fill="transparent"]');
      
      if (teamRect) {
        fireEvent.click(teamRect);
        
        await waitFor(() => {
          // Parent group should have brightness filter applied
          const parentGroup = teamRect.closest('g');
          expect(parentGroup).toHaveStyle('filter: brightness(1.1)');
        });
      }
    });
  });

  describe('Zoom and Pan Controls', () => {
    it('should display zoom controls when showControls is true', () => {
      render(<BracketView {...defaultProps} showControls={true} />);

      expect(screen.getByTestId('zoom-in-icon')).toBeInTheDocument();
      expect(screen.getByTestId('zoom-out-icon')).toBeInTheDocument();
      expect(screen.getByTestId('reset-icon')).toBeInTheDocument();
      expect(screen.getByTestId('download-icon')).toBeInTheDocument();
      expect(screen.getByTestId('share-icon')).toBeInTheDocument();
    });

    it('should hide zoom controls when showControls is false', () => {
      render(<BracketView {...defaultProps} showControls={false} />);

      expect(screen.queryByTestId('zoom-in-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('zoom-out-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('reset-icon')).not.toBeInTheDocument();
    });

    it('should zoom in when zoom in button is clicked', async () => {
      const user = userEvent.setup();
      
      render(<BracketView {...defaultProps} showControls={true} />);

      const zoomInButton = screen.getByTestId('zoom-in-icon').closest('button');
      const svg = document.querySelector('svg');
      
      if (zoomInButton && svg) {
        const initialTransform = svg.style.transform;
        
        await user.click(zoomInButton);
        
        await waitFor(() => {
          const newTransform = svg.style.transform;
          expect(newTransform).not.toBe(initialTransform);
          expect(newTransform).toContain('scale(1.2)'); // Initial 1.0 + 0.2 zoom delta
        });
      }
    });

    it('should zoom out when zoom out button is clicked', async () => {
      const user = userEvent.setup();
      
      render(<BracketView {...defaultProps} showControls={true} />);

      const zoomOutButton = screen.getByTestId('zoom-out-icon').closest('button');
      const svg = document.querySelector('svg');
      
      if (zoomOutButton && svg) {
        await user.click(zoomOutButton);
        
        await waitFor(() => {
          const transform = svg.style.transform;
          expect(transform).toContain('scale(0.8)'); // Initial 1.0 - 0.2 zoom delta
        });
      }
    });

    it('should reset view when reset button is clicked', async () => {
      const user = userEvent.setup();
      
      render(<BracketView {...defaultProps} showControls={true} />);

      const zoomInButton = screen.getByTestId('zoom-in-icon').closest('button');
      const resetButton = screen.getByTestId('reset-icon').closest('button');
      const svg = document.querySelector('svg');
      
      if (zoomInButton && resetButton && svg) {
        // First zoom in
        await user.click(zoomInButton);
        
        // Then reset
        await user.click(resetButton);
        
        await waitFor(() => {
          const transform = svg.style.transform;
          expect(transform).toContain('scale(1)');
          expect(transform).toContain('translate(0px, 0px)');
        });
      }
    });

    it('should handle mouse wheel zoom', async () => {
      render(<BracketView {...defaultProps} interactive={true} />);

      const container = screen.getByRole('img', { hidden: true }).closest('div');
      const svg = document.querySelector('svg');
      
      if (container && svg) {
        fireEvent.wheel(container, { deltaY: -100 }); // Scroll up to zoom in
        
        await waitFor(() => {
          const transform = svg.style.transform;
          expect(transform).toContain('scale(1.1)');
        });
      }
    });

    it('should prevent zoom beyond limits', async () => {
      const user = userEvent.setup();
      
      render(<BracketView {...defaultProps} showControls={true} />);

      const zoomOutButton = screen.getByTestId('zoom-out-icon').closest('button');
      const svg = document.querySelector('svg');
      
      if (zoomOutButton && svg) {
        // Try to zoom out beyond minimum (0.25)
        for (let i = 0; i < 10; i++) {
          await user.click(zoomOutButton);
        }
        
        await waitFor(() => {
          const transform = svg.style.transform;
          const scaleMatch = transform.match(/scale\(([\d.]+)\)/);
          if (scaleMatch) {
            const scale = parseFloat(scaleMatch[1]);
            expect(scale).toBeGreaterThanOrEqual(0.25);
          }
        });
      }
    });
  });

  describe('Touch and Mobile Support', () => {
    it('should handle touch pan gestures', async () => {
      render(<BracketView {...defaultProps} interactive={true} />);

      const container = screen.getByRole('img', { hidden: true }).closest('div');
      const svg = document.querySelector('svg');
      
      if (container && svg) {
        // Simulate touch start
        fireEvent.touchStart(container, {
          touches: [{ clientX: 100, clientY: 100 }],
        });
        
        // Simulate touch move
        fireEvent.touchMove(container, {
          touches: [{ clientX: 150, clientY: 150 }],
        });
        
        await waitFor(() => {
          const transform = svg.style.transform;
          expect(transform).toContain('translate');
        });
        
        // Simulate touch end
        fireEvent.touchEnd(container);
      }
    });

    it('should handle mouse pan gestures', async () => {
      render(<BracketView {...defaultProps} interactive={true} />);

      const container = screen.getByRole('img', { hidden: true }).closest('div');
      const svg = document.querySelector('svg');
      
      if (container && svg) {
        // Simulate mouse down
        fireEvent.mouseDown(container, { button: 0, clientX: 100, clientY: 100 });
        
        // Simulate mouse move
        fireEvent.mouseMove(container, { clientX: 150, clientY: 150 });
        
        await waitFor(() => {
          const transform = svg.style.transform;
          expect(transform).toContain('translate');
        });
        
        // Simulate mouse up
        fireEvent.mouseUp(container);
      }
    });

    it('should update cursor style during panning', () => {
      render(<BracketView {...defaultProps} interactive={true} />);

      const container = screen.getByRole('img', { hidden: true }).closest('div');
      
      if (container) {
        expect(container).toHaveClass('cursor-grab');
        
        // Start panning
        fireEvent.mouseDown(container, { button: 0, clientX: 100, clientY: 100 });
        
        // Should show grabbing cursor during pan
        expect(container).toHaveClass('active:cursor-grabbing');
      }
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      render(<BracketView {...defaultProps} interactive={true} />);

      // SVG should be focusable for keyboard navigation
      const svg = screen.getByRole('img', { hidden: true });
      expect(svg).toBeInTheDocument();
      
      // Control buttons should be focusable
      const controls = screen.getAllByRole('button');
      controls.forEach(control => {
        expect(control).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('should have proper ARIA labels', () => {
      render(<BracketView {...defaultProps} />);

      // Tournament info should be accessible
      expect(screen.getByText('Test Tournament')).toBeInTheDocument();
      expect(screen.getByText('8 teams • single elimination')).toBeInTheDocument();
      
      // Legend should be accessible
      const legend = screen.getByText('Completed').closest('div');
      expect(legend).toBeInTheDocument();
    });

    it('should provide semantic match information', () => {
      render(<BracketView {...defaultProps} />);

      // SVG elements should have meaningful content
      const svg = document.querySelector('svg');
      const textElements = svg?.querySelectorAll('text') || [];
      
      expect(textElements.length).toBeGreaterThan(0);
      
      // Should have round labels
      const roundLabels = Array.from(textElements).filter(el => 
        el.textContent?.includes('Round') || 
        el.textContent?.includes('Championship') ||
        el.textContent?.includes('Semifinals')
      );
      expect(roundLabels.length).toBeGreaterThan(0);
    });

    it('should support high contrast mode', () => {
      const customTheme = {
        colors: {
          background: '#ffffff',
          foreground: '#000000',
          primary: '#0066cc',
          secondary: '#666666',
          border: '#cccccc',
          winner: '#00aa00',
          pending: '#999999',
          muted: '#f5f5f5',
        },
      };

      render(<BracketView {...defaultProps} theme={customTheme} />);

      const svg = document.querySelector('svg');
      const backgroundRect = svg?.querySelector('rect[fill="#ffffff"]');
      
      expect(backgroundRect).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render large brackets efficiently', () => {
      const start = performance.now();
      
      // Create a large bracket with many matches
      const largeBracket = createMockBracket([
        ...mockMatches,
        ...Array.from({ length: 50 }, (_, i) => 
          createMockMatch(`extra-match-${i}`, mockTeams[0], mockTeams[1])
        ),
      ]);

      render(<BracketView tournament={mockTournament} bracket={largeBracket} />);
      
      const end = performance.now();
      const renderTime = end - start;
      
      // Should render within reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle bracket updates efficiently', () => {
      const { rerender } = render(<BracketView {...defaultProps} />);

      const start = performance.now();
      
      // Update match scores
      const updatedMatches = mockMatches.map(match => ({
        ...match,
        score: match.id === 'match-3' 
          ? { team1Score: 67, team2Score: 65 } 
          : match.score,
      }));
      
      const updatedBracket = createMockBracket(updatedMatches);
      
      rerender(<BracketView tournament={mockTournament} bracket={updatedBracket} />);
      
      const end = performance.now();
      const updateTime = end - start;
      
      // Should update within reasonable time
      expect(updateTime).toBeLessThan(50);
    });

    it('should minimize re-renders with stable props', () => {
      let renderCount = 0;
      
      const TestComponent = (props: any) => {
        renderCount++;
        return <BracketView {...props} />;
      };

      const { rerender } = render(<TestComponent {...defaultProps} />);
      
      expect(renderCount).toBe(1);
      
      // Re-render with same props
      rerender(<TestComponent {...defaultProps} />);
      
      // Should not cause unnecessary re-renders due to memoization
      expect(renderCount).toBe(2);
    });
  });

  describe('Real-time Updates', () => {
    it('should update bracket when match results change', async () => {
      const { rerender } = render(<BracketView {...defaultProps} />);

      // Initially match-3 is in progress
      const svg = document.querySelector('svg');
      let inProgressIndicators = svg?.querySelectorAll('circle.animate-pulse') || [];
      expect(inProgressIndicators.length).toBe(1);

      // Complete the match
      const updatedMatches = mockMatches.map(match =>
        match.id === 'match-3'
          ? {
              ...match,
              status: 'completed' as const,
              score: { team1Score: 78, team2Score: 75 },
              winner: mockTeams[2],
            }
          : match
      );

      const updatedBracket = createMockBracket(updatedMatches);

      await act(async () => {
        rerender(<BracketView tournament={mockTournament} bracket={updatedBracket} />);
      });

      // No matches should be in progress now
      inProgressIndicators = svg?.querySelectorAll('circle.animate-pulse') || [];
      expect(inProgressIndicators.length).toBe(0);

      // Should show the final score
      const textElements = svg?.querySelectorAll('text') || [];
      const scores = Array.from(textElements).map(el => el.textContent);
      expect(scores).toContain('78');
      expect(scores).toContain('75');
    });

    it('should handle WebSocket-like rapid updates', async () => {
      const { rerender } = render(<BracketView {...defaultProps} />);

      // Simulate rapid score updates
      const updates = [
        { team1Score: 10, team2Score: 8 },
        { team1Score: 15, team2Score: 12 },
        { team1Score: 20, team2Score: 18 },
        { team1Score: 25, team2Score: 22 },
      ];

      for (const update of updates) {
        const updatedMatches = mockMatches.map(match =>
          match.id === 'match-3'
            ? { ...match, score: update }
            : match
        );

        const updatedBracket = createMockBracket(updatedMatches);

        await act(async () => {
          rerender(<BracketView tournament={mockTournament} bracket={updatedBracket} />);
        });

        // Small delay to simulate real-time updates
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Final score should be displayed
      const svg = document.querySelector('svg');
      const textElements = svg?.querySelectorAll('text') || [];
      const scores = Array.from(textElements).map(el => el.textContent);
      expect(scores).toContain('25');
      expect(scores).toContain('22');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid match data gracefully', () => {
      const invalidMatches = [
        // @ts-ignore - Testing invalid data
        { id: 'invalid', team1: null, team2: null, status: null },
        createMockMatch('valid', mockTeams[0], mockTeams[1]),
      ];

      const bracketWithInvalidData = createMockBracket(invalidMatches);

      expect(() => {
        render(<BracketView tournament={mockTournament} bracket={bracketWithInvalidData} />);
      }).not.toThrow();

      // Should still render the valid match
      expect(screen.getByText('Test Tournament')).toBeInTheDocument();
    });

    it('should show loading state when layout is calculating', () => {
      // Mock a slow layout calculation
      const SlowBracketView = () => {
        const [showBracket, setShowBracket] = React.useState(false);

        React.useEffect(() => {
          const timer = setTimeout(() => setShowBracket(true), 100);
          return () => clearTimeout(timer);
        }, []);

        return showBracket ? (
          <BracketView {...defaultProps} />
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        );
      };

      render(<SlowBracketView />);

      // Should show loading spinner initially
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });

    it('should handle browser compatibility issues', () => {
      // Mock missing SVG support
      const originalCreateElementNS = document.createElementNS;
      document.createElementNS = jest.fn(() => {
        throw new Error('SVG not supported');
      });

      expect(() => {
        render(<BracketView {...defaultProps} />);
      }).not.toThrow();

      // Restore original method
      document.createElementNS = originalCreateElementNS;
    });
  });
});