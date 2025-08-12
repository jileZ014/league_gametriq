# Public Portal Mock - Phoenix Flight Youth Basketball

## Overview
This is a static HTML mock of the Gametriq Basketball League Management Platform's public portal. It demonstrates the key features without requiring any backend services.

## Files
- `index.html` - Complete single-page application with all sections
- `gametriq_demo.ics` - Sample ICS calendar file for team schedule
- `README.md` - This documentation file

## Features Demonstrated

### 1. Public Navigation
- Sticky header with smooth scroll navigation
- Mobile-responsive hamburger menu
- In-page anchor links to all sections

### 2. Home Section
- League information and quick stats
- Heat safety warning (Phoenix-specific)
- Calendar subscription download link
- Featured announcements

### 3. Schedule Section
- Upcoming and completed games
- MST timezone display (Phoenix - no DST)
- Game status indicators
- Venue information

### 4. Standings Section
- Full division standings with 12 teams
- Playoff qualification indicators (top 8)
- Win/loss records and point differentials
- Current streaks

### 5. Playoff Bracket
- Visual single-elimination tournament
- 8-team bracket with scores
- Quarterfinals → Semifinals → Championship
- Third-place match included
- Tournament MVP and All-Tournament team

### 6. Officials Assignments
- Game assignments table
- Official certification levels and rates
- Travel time warnings
- Assignment statistics and cost summary

### 7. ICS Calendar Export
- Downloads `gametriq_demo.ics` file
- Contains 6 sample events:
  - 3 regular season games
  - 1 playoff game
  - Team picture day
  - End of season celebration
- Phoenix timezone configured (MST, no DST)
- Heat safety warnings embedded

## Technical Details

### Styling
- Tailwind CSS via CDN for rapid prototyping
- Custom CSS for bracket visualization
- Mobile-responsive design
- Print-friendly styles

### Browser Compatibility
- Works in all modern browsers
- No JavaScript required (except mobile menu)
- Smooth scroll behavior
- Offline capable (no external dependencies except Tailwind CDN)

### Phoenix-Specific Features
- Heat safety protocol warnings (105°F threshold)
- MST timezone handling (no daylight saving)
- Desert venue locations
- Local team names and branding

## How to Use

1. **Local Viewing**:
   ```bash
   # Open directly in browser
   open index.html
   # Or
   firefox index.html
   # Or
   chrome index.html
   ```

2. **Calendar Download**:
   - Click "Subscribe to Calendar" button
   - Opens standard download dialog
   - Import into any calendar app

3. **Navigation**:
   - Click nav links to jump to sections
   - Mobile: Tap hamburger menu
   - All links use smooth scrolling

4. **Printing**:
   - Print-friendly styles included
   - Navigation and warnings hidden
   - Tables properly formatted

## Demo Data

### Teams (U12 Division)
1. Phoenix Suns (10-2) - Champions
2. Phoenix Mercury (9-3)
3. Arizona Rattlers (8-4)
4. Phoenix Rising (8-4)
5. Desert Coyotes (7-5)
6. Scottsdale Scorpions (7-5)
7. Desert Thunder (6-6)
8. Valley Hawks (5-7)
9. Monsoon Storm (5-7)
10. Phoenix Heat (4-8)
11. Desert Vipers (3-9)
12. Firebirds (2-10)

### Officials
- Thomas Wilson (Advanced, $45/hr)
- Patricia Moore (Expert, $55/hr)
- Christopher Taylor (Intermediate, $35/hr)
- Daniel Anderson (Advanced, $45/hr)
- Michelle Jackson (Beginner, $25/hr)

### Venues
- Desert Sky Sports Complex
- Steele Indian School Park
- Paradise Valley Community Center
- South Mountain Community Center
- Deer Valley Community Center
- Washington Park

## Performance
- Page load: <200ms (local)
- No external API calls
- Single HTML file: ~95KB
- ICS file: 4KB
- Total package: <100KB

## Customization
To customize for other leagues:
1. Update team names and records in standings
2. Modify bracket matchups and scores
3. Change venue locations
4. Adjust timezone settings
5. Update color scheme (currently orange/Phoenix themed)

## License
Demo content for Gametriq Platform MVP
© 2024 - For demonstration purposes only