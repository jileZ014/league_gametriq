# Gametriq Accessibility Checklist

## WCAG 2.1 AA Compliance Matrix

### ✅ Required for Launch | ⚠️ Recommended | 💡 Nice to Have

---

## 1. Perceivable

### 1.1 Text Alternatives
- [✅] All images have meaningful alt text
- [✅] Decorative images use `alt=""` or `role="presentation"`
- [✅] Complex images have long descriptions
- [✅] Icons have accessible labels
- [✅] Video content has captions
- [⚠️] Audio content has transcripts

### 1.2 Time-Based Media
- [✅] Live score updates announced to screen readers
- [✅] Animation can be paused/stopped
- [⚠️] Video has audio descriptions
- [💡] Sign language interpretation available

### 1.3 Adaptable
- [✅] Content reflows at 400% zoom
- [✅] Proper semantic HTML structure
- [✅] Tables have proper headers
- [✅] Forms have associated labels
- [✅] Reading order is logical
- [✅] Orientation works in portrait/landscape

### 1.4 Distinguishable
- [✅] **Color Contrast - Normal Text**: 4.5:1 minimum
- [✅] **Color Contrast - Large Text**: 3:1 minimum
- [✅] **Color Contrast - UI Components**: 3:1 minimum
- [✅] Color not sole indicator of meaning
- [✅] Text resizable to 200% without loss
- [✅] No images of text (except logos)
- [⚠️] Background audio can be controlled

---

## 2. Operable

### 2.1 Keyboard Accessible
- [✅] All functionality keyboard accessible
- [✅] No keyboard traps
- [✅] Skip links provided
- [✅] Focus order logical
- [✅] Shortcuts documented
- [⚠️] Character key shortcuts can be disabled

### 2.2 Enough Time
- [✅] Time limits adjustable
- [✅] Auto-updating content can be paused
- [✅] Session timeout warnings provided
- [✅] Data preserved on re-authentication

### 2.3 Seizures
- [✅] No flashing > 3 times per second
- [✅] Motion can be disabled
- [✅] Parallax effects optional

### 2.4 Navigable
- [✅] Page titles descriptive
- [✅] Focus visible at all times
- [✅] Link purpose clear from context
- [✅] Multiple navigation methods
- [✅] Headings describe content
- [✅] Labels describe purpose

### 2.5 Input Modalities
- [✅] Touch targets ≥ 44×44 pixels
- [✅] Pointer gestures have alternatives
- [✅] Motion activation optional
- [✅] Label in name for UI components
- [⚠️] Concurrent input mechanisms supported

---

## 3. Understandable

### 3.1 Readable
- [✅] Page language identified
- [✅] Language of parts identified
- [⚠️] Unusual words explained
- [⚠️] Abbreviations expanded
- [💡] Reading level appropriate

### 3.2 Predictable
- [✅] Focus doesn't trigger changes
- [✅] Input doesn't trigger changes
- [✅] Navigation consistent
- [✅] Identification consistent
- [✅] Changes on request only

### 3.3 Input Assistance
- [✅] Errors identified and described
- [✅] Labels and instructions provided
- [✅] Error suggestions offered
- [✅] Error prevention for legal/financial
- [✅] Submissions reversible/confirmable

---

## 4. Robust

### 4.1 Compatible
- [✅] Valid HTML markup
- [✅] Name, role, value programmatically set
- [✅] Status messages announced
- [✅] Works with assistive technology

---

## Component-Specific Checklists

### ScoreCard Component
```typescript
// Accessibility requirements
interface ScoreCardA11y {
  role: 'region';
  ariaLabel: string;
  ariaLive: 'polite' | 'assertive';
  ariaAtomic: true;
  tabIndex: 0;
}
```

- [✅] Announces score changes
- [✅] Team names readable
- [✅] Status changes announced
- [✅] Keyboard navigable
- [✅] High contrast mode supported

### BoxScoreTable Component
```typescript
// Table accessibility
interface TableA11y {
  role: 'table';
  ariaLabel: string;
  ariaRowCount: number;
  ariaColCount: number;
  caption: string;
}
```

- [✅] Column headers associated
- [✅] Row headers identified
- [✅] Sort state announced
- [✅] Cell navigation with arrows
- [✅] Summary provided

### Form Components
- [✅] Labels associated with inputs
- [✅] Required fields indicated
- [✅] Error messages linked
- [✅] Instructions clear
- [✅] Fieldsets for groups

---

## Testing Tools & Setup

### Automated Testing

#### Storybook Axe Addon
```javascript
// .storybook/main.js
module.exports = {
  addons: [
    '@storybook/addon-a11y',
  ],
};

// .storybook/preview.js
export const parameters = {
  a11y: {
    element: '#root',
    config: {
      rules: [
        {
          id: 'color-contrast',
          enabled: true,
        },
      ],
    },
    options: {
      checks: { 'color-contrast': { enabled: true } },
      rules: {
        'color-contrast': { enabled: true },
        'valid-lang': { enabled: true },
      },
    },
  },
};
```

#### Jest Axe Testing
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('should not have accessibility violations', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

#### Playwright Axe
```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('homepage accessibility', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: {
      html: true,
    },
  });
});
```

### Manual Testing

#### Screen Readers
- **NVDA** (Windows) - Free
- **JAWS** (Windows) - Commercial
- **VoiceOver** (macOS/iOS) - Built-in
- **TalkBack** (Android) - Built-in

#### Browser Extensions
- axe DevTools
- WAVE
- Lighthouse
- Accessibility Insights

#### Keyboard Navigation Test
1. Tab through all interactive elements
2. Verify focus indicators visible
3. Test Enter/Space activation
4. Check Escape key behavior
5. Verify no keyboard traps

---

## Color Contrast Requirements

### Text Contrast Ratios
```css
/* Normal Text (< 18px) */
--min-contrast-normal: 4.5:1;

/* Large Text (≥ 18px or ≥ 14px bold) */
--min-contrast-large: 3:1;

/* UI Components & Graphics */
--min-contrast-ui: 3:1;
```

### Team Color Validation
```typescript
function validateTeamColors(fg: string, bg: string): boolean {
  const ratio = getContrastRatio(fg, bg);
  return ratio >= 4.5; // WCAG AA
}

// Provide alternative if contrast fails
if (!validateTeamColors(teamColor, background)) {
  return addBorder ? `2px solid ${teamColor}` : defaultColor;
}
```

---

## Focus Management

### Focus Indicators
```css
/* Visible focus for keyboard users */
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Remove for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Focus Trap Implementation
```typescript
import { FocusTrap } from '@/utils/focus-trap';

const Modal = ({ isOpen, onClose, children }) => {
  const trapRef = useRef<FocusTrap>();
  
  useEffect(() => {
    if (isOpen) {
      trapRef.current = new FocusTrap(modalRef.current);
      trapRef.current.activate();
    }
    return () => trapRef.current?.deactivate();
  }, [isOpen]);
  
  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {children}
    </div>
  );
};
```

---

## ARIA Implementation

### Live Regions
```html
<!-- Score updates -->
<div aria-live="polite" aria-atomic="true">
  Score: Home 96, Away 102
</div>

<!-- Urgent notifications -->
<div role="alert" aria-live="assertive">
  Game has ended
</div>

<!-- Status messages -->
<div role="status" aria-live="polite">
  Loading more games...
</div>
```

### Landmarks
```html
<header role="banner">
<nav role="navigation">
<main role="main">
<aside role="complementary">
<footer role="contentinfo">
```

### States & Properties
```html
<!-- Expanded/Collapsed -->
<button aria-expanded="false" aria-controls="panel-1">

<!-- Selected -->
<option aria-selected="true">

<!-- Current -->
<a aria-current="page">

<!-- Invalid -->
<input aria-invalid="true" aria-describedby="error-1">

<!-- Loading -->
<div aria-busy="true" aria-label="Loading scores">
```

---

## Mobile Accessibility

### Touch Targets
```css
/* Minimum touch target size */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  
  /* Add padding if content is smaller */
  position: relative;
}

.touch-target::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: max(100%, 44px);
  height: max(100%, 44px);
}
```

### Gesture Alternatives
```typescript
// Provide button alternatives for gestures
const ScoreControl = () => {
  return (
    <>
      {/* Gesture: Swipe up to increase */}
      <div onSwipeUp={increaseScore}>
        
        {/* Alternative: Button */}
        <button 
          onClick={increaseScore}
          aria-label="Increase score"
        >
          +
        </button>
      </div>
    </>
  );
};
```

---

## Performance & Accessibility

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast Mode
```css
@media (prefers-contrast: high) {
  :root {
    --foreground: CanvasText;
    --background: Canvas;
    --primary: LinkText;
    --border: ButtonText;
  }
}
```

### Dark Mode
```css
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    /* Dark theme variables */
  }
}
```

---

## Compliance Tracking

### Severity Levels
- **Critical**: Blocks access to content
- **Serious**: Significant barriers
- **Moderate**: Some difficulty
- **Minor**: Minimal impact

### Testing Schedule
- [ ] Daily: Automated axe tests in CI
- [ ] Weekly: Manual keyboard testing
- [ ] Sprint: Full accessibility audit
- [ ] Release: Third-party validation

### Metrics Target
- Axe violations: 0 critical, 0 serious
- Lighthouse Accessibility: ≥95
- Keyboard navigation: 100% coverage
- Screen reader: All content accessible

---

## Resources

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

### Training
- Screen reader basics
- Keyboard navigation patterns
- ARIA best practices
- Color contrast tools

### Support
- Accessibility team contact
- Bug reporting process
- User feedback channels
- Assistive technology loans