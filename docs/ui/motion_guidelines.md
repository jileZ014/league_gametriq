# Gametriq Motion Guidelines

## Philosophy
Motion in Gametriq should feel athletic, celebratory, and responsive - inspired by NBA 2K's dynamic animations while maintaining ESPN's professional clarity.

---

## Core Principles

### 1. **Purpose-Driven**
Every animation must serve a purpose:
- **Orient** - Show spatial relationships
- **Focus** - Direct attention
- **Feedback** - Confirm actions
- **Delight** - Celebrate achievements
- **Connect** - Show cause and effect

### 2. **Performance First**
- 60fps is non-negotiable
- Use CSS transforms only
- GPU-accelerated properties
- Reduce motion for accessibility
- Test on mid-range devices

### 3. **Consistent Timing**
- Use design token durations
- Follow natural easing curves
- Respect user preferences
- Match brand personality

---

## Animation Catalog

### Entrance Animations

#### SlideIn
```css
@keyframes slideIn {
  from { 
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Usage */
.slide-in {
  animation: slideIn 300ms var(--ease-out);
}
```
**Use for:** New content, page transitions, drawer menus

#### FadeIn
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Usage */
.fade-in {
  animation: fadeIn 200ms var(--ease-out);
}
```
**Use for:** Supporting content, overlays, tooltips

#### ScaleUp
```css
@keyframes scaleUp {
  0% {
    transform: scale(0.95);
    opacity: 0;
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Usage */
.scale-up {
  animation: scaleUp 300ms var(--ease-overshoot);
}
```
**Use for:** Cards, modals, celebration moments

### State Change Animations

#### PulseGlow
```css
@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 16px var(--glow-color);
  }
  50% {
    box-shadow: 0 0 32px var(--glow-color);
  }
}

/* Usage */
.pulse-glow {
  animation: pulseGlow 2s ease-in-out infinite;
}
```
**Use for:** Live indicators, active states, alerts

#### CountUp
```css
@keyframes countUp {
  0% {
    transform: translateY(10px);
    opacity: 0;
  }
  50% {
    transform: translateY(-2px);
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Usage */
.count-up {
  animation: countUp 600ms var(--ease-out);
}
```
**Use for:** Score updates, number changes, statistics

### Micro-interactions

#### Hover States
```css
.interactive {
  transition: all 200ms var(--ease-out);
}

.interactive:hover {
  transform: scale(1.02);
  box-shadow: 0 0 16px var(--glow-color);
}
```

#### Press States
```css
.interactive:active {
  transform: scale(0.98);
  transition-duration: 100ms;
}
```

#### Focus States
```css
.interactive:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  transition: outline-offset 200ms;
}
```

### Loading & Progress

#### Shimmer
```css
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.shimmer {
  background: linear-gradient(
    90deg,
    var(--background) 0%,
    var(--background-elevated) 50%,
    var(--background) 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s linear infinite;
}
```

#### Spinner
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

---

## Timing Functions

### Standard Easings
```css
:root {
  --ease-linear: linear;
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Special Easings
```css
:root {
  /* Overshoot for playful elements */
  --ease-overshoot: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  
  /* Spring for elastic feel */
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  /* Sharp for quick actions */
  --ease-sharp: cubic-bezier(0.4, 0, 0.6, 1);
}
```

---

## Duration Scale

```css
:root {
  --duration-instant: 100ms;  /* Immediate feedback */
  --duration-fast: 200ms;     /* Quick transitions */
  --duration-normal: 300ms;   /* Standard animations */
  --duration-slow: 500ms;     /* Deliberate movements */
  --duration-slower: 700ms;   /* Complex sequences */
  --duration-slowest: 1000ms; /* Major transitions */
}
```

### Duration Guidelines
- **Hover effects**: 100-200ms
- **State changes**: 200-300ms
- **Page transitions**: 300-500ms
- **Complex animations**: 500-1000ms
- **Continuous loops**: 2000ms+

---

## Responsive Motion

### Touch Devices
```css
@media (hover: none) and (pointer: coarse) {
  /* Reduce hover effects */
  .interactive:hover {
    transform: none;
  }
  
  /* Enhance touch feedback */
  .interactive:active {
    transform: scale(0.95);
    transition-duration: 50ms;
  }
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  /* Keep essential motion */
  .essential-motion {
    animation-duration: 200ms !important;
    transition-duration: 200ms !important;
  }
}
```

---

## Performance Guidelines

### GPU Acceleration
```css
/* Good - GPU accelerated */
.optimized {
  transform: translateX(100px);
  opacity: 0.5;
  will-change: transform, opacity;
}

/* Bad - Triggers reflow/repaint */
.not-optimized {
  left: 100px;
  width: 200px;
  height: 100px;
}
```

### Will-Change Usage
```css
/* Add before animation */
.will-animate {
  will-change: transform;
}

/* Remove after animation */
.animation-done {
  will-change: auto;
}
```

### Batch Animations
```javascript
// Good - Single reflow
requestAnimationFrame(() => {
  elements.forEach(el => {
    el.style.transform = 'translateX(100px)';
  });
});

// Bad - Multiple reflows
elements.forEach(el => {
  el.style.left = '100px'; // Triggers reflow each time
});
```

---

## Sport-Specific Animations

### Score Celebration
```css
@keyframes scoreCelebration {
  0% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.2) rotate(5deg);
  }
  50% {
    transform: scale(1.1) rotate(-5deg);
  }
  75% {
    transform: scale(1.15) rotate(3deg);
  }
  100% {
    transform: scale(1) rotate(0);
  }
}
```

### Game Start
```css
@keyframes gameStart {
  0% {
    transform: scale(0) rotate(180deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.1) rotate(90deg);
    opacity: 1;
  }
  100% {
    transform: scale(1) rotate(0);
  }
}
```

### Victory Animation
```css
@keyframes victory {
  0%, 100% {
    transform: translateY(0);
  }
  25% {
    transform: translateY(-20px);
  }
  50% {
    transform: translateY(0);
  }
  75% {
    transform: translateY(-10px);
  }
}
```

---

## Implementation Checklist

### Before Launch
- [ ] Test on real devices (not just Chrome DevTools)
- [ ] Verify 60fps on mid-range devices
- [ ] Check reduced motion preferences
- [ ] Validate touch gestures
- [ ] Test with screen readers
- [ ] Profile performance impact
- [ ] Review animation purpose
- [ ] Document custom animations

### Performance Metrics
- FPS during animation: ≥60
- Paint time: <16ms
- Composite time: <4ms
- Memory usage: <10MB increase
- Battery impact: Minimal

---

## Examples

### Complete Component Animation
```tsx
const ScoreUpdate = ({ score, prevScore }) => {
  const isIncrease = score > prevScore;
  
  return (
    <motion.div
      initial={{ 
        scale: 0.8, 
        opacity: 0,
        y: isIncrease ? 20 : -20 
      }}
      animate={{ 
        scale: [0.8, 1.1, 1],
        opacity: 1,
        y: 0 
      }}
      transition={{
        duration: 0.6,
        ease: [0.68, -0.55, 0.265, 1.55]
      }}
      className={cn(
        'text-4xl font-bold',
        isIncrease && 'text-success',
        !isIncrease && 'text-error'
      )}
    >
      {score}
    </motion.div>
  );
};
```

---

## Resources

### Testing Tools
- Chrome DevTools Performance tab
- React DevTools Profiler
- Lighthouse CI
- WebPageTest

### Animation Libraries
- Framer Motion (React)
- CSS Animation API
- Web Animations API
- GSAP (for complex sequences)

### Inspiration
- NBA 2K UI animations
- ESPN score updates
- Material Design motion
- iOS Human Interface Guidelines