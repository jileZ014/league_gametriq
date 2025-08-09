# Interaction Patterns & Micro-animations
## Basketball League Management Platform Phase 2

**Document ID:** INT-BLMP-001  
**Version:** 1.0  
**Date:** August 8, 2025  
**Author:** Sports UI/UX Designer  
**Status:** Phase 2 Interaction Specifications  

---

## Executive Summary

This document defines comprehensive interaction patterns and micro-animations for the Basketball League Management Platform Phase 2. These patterns ensure consistent, delightful user experiences while maintaining performance and accessibility across all devices and user capabilities.

### Interaction Design Principles
- **Basketball Context**: Interactions reflect sports environment and urgency
- **Performance First**: 60fps animations, optimized for mobile devices
- **Accessibility Compliant**: Respects motion preferences, provides alternatives
- **Multi-Generational**: Age-appropriate interactions from children to seniors
- **Touch-Optimized**: Designed for fingers, stylus, and mouse input

---

## Table of Contents

1. [Animation Framework](#1-animation-framework)
2. [Basketball-Specific Interactions](#2-basketball-specific-interactions)
3. [Core UI Interactions](#3-core-ui-interactions)
4. [Form Interactions](#4-form-interactions)
5. [Navigation Patterns](#5-navigation-patterns)
6. [Feedback Systems](#6-feedback-systems)
7. [Loading & State Transitions](#7-loading--state-transitions)
8. [Accessibility Considerations](#8-accessibility-considerations)

---

## 1. Animation Framework

### 1.1 Motion Design System

```css
/* Core Animation Variables */
:root {
  /* Timing Functions */
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);
  --ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
  --ease-basketball: cubic-bezier(0.68, -0.55, 0.265, 1.55); /* Basketball bounce */
  
  /* Duration Scales */
  --duration-instant: 100ms;
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
  --duration-slower: 500ms;
  
  /* Basketball-specific timings */
  --score-update-duration: 300ms;
  --game-clock-transition: 200ms;
  --court-animation: 400ms;
  --celebration-duration: 800ms;
}

/* Performance-optimized animations */
.animate {
  will-change: transform;
  backface-visibility: hidden;
  perspective: 1000px;
}

.animate-complete {
  will-change: auto;
}
```

### 1.2 Basketball Motion Language

```css
/* Basketball-inspired easing curves */
@keyframes basketball-bounce {
  0% { transform: translateY(0) scale(1); }
  25% { transform: translateY(-8px) scale(1.05); }
  50% { transform: translateY(0) scale(0.98); }
  75% { transform: translateY(-4px) scale(1.02); }
  100% { transform: translateY(0) scale(1); }
}

@keyframes court-slide-in {
  0% { 
    transform: translateX(-100%);
    opacity: 0;
  }
  60% {
    transform: translateX(8px);
  }
  100% { 
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes score-celebration {
  0%, 100% { 
    transform: scale(1) rotate(0deg);
    color: var(--text-primary);
  }
  25% { 
    transform: scale(1.2) rotate(-2deg);
    color: var(--color-success);
  }
  50% { 
    transform: scale(1.3) rotate(2deg);
    color: var(--color-primary);
  }
  75% { 
    transform: scale(1.1) rotate(-1deg);
    color: var(--color-success);
  }
}

/* Reduced motion alternatives */
@media (prefers-reduced-motion: reduce) {
  @keyframes basketball-bounce {
    0%, 100% { transform: none; }
    50% { background-color: var(--color-primary-light); }
  }
  
  @keyframes court-slide-in {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  
  @keyframes score-celebration {
    0%, 100% { color: var(--text-primary); }
    50% { color: var(--color-success); }
  }
}
```

---

## 2. Basketball-Specific Interactions

### 2.1 Live Score Updates

```css
/* Score change animation */
.score-value {
  display: inline-block;
  font-family: var(--font-mono);
  font-weight: 700;
  transition: all var(--score-update-duration) var(--ease-basketball);
}

.score-value.updating {
  animation: score-celebration var(--score-update-duration) var(--ease-basketball);
  position: relative;
}

.score-value.updating::after {
  content: '+' attr(data-points);
  position: absolute;
  top: -20px;
  right: -10px;
  font-size: 0.8em;
  color: var(--color-success);
  opacity: 0;
  animation: score-indicator 1.5s var(--ease-out-expo);
}

@keyframes score-indicator {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-30px) scale(0.8);
  }
}

/* Implementation */
.score-display {
  overflow: visible;
  position: relative;
}

.score-change-positive {
  animation: score-increase 0.6s var(--ease-basketball);
}

.score-change-positive::before {
  content: '🏀';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.5em;
  opacity: 0;
  animation: basketball-celebration 0.8s var(--ease-out-expo) 0.2s;
}

@keyframes basketball-celebration {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -80%) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -120%) scale(0.8);
  }
}
```

#### JavaScript Implementation

```javascript
class ScoreAnimator {
  constructor(scoreElement) {
    this.element = scoreElement;
    this.currentScore = parseInt(scoreElement.textContent) || 0;
  }
  
  updateScore(newScore, pointsScored) {
    const oldScore = this.currentScore;
    this.currentScore = newScore;
    
    // Set data attributes for CSS animations
    this.element.dataset.points = pointsScored;
    this.element.textContent = newScore;
    
    // Trigger animation
    this.element.classList.remove('updating');
    void this.element.offsetWidth; // Force reflow
    this.element.classList.add('updating');
    
    // Announce to screen readers
    this.announceScoreChange(oldScore, newScore, pointsScored);
    
    // Clean up after animation
    setTimeout(() => {
      this.element.classList.remove('updating');
      delete this.element.dataset.points;
    }, 800);
  }
  
  announceScoreChange(oldScore, newScore, points) {
    const announcement = `Score updated: ${points} points scored. New score: ${newScore}`;
    const announcer = document.getElementById('score-announcer');
    if (announcer) {
      announcer.textContent = announcement;
    }
  }
}
```

### 2.2 Game Clock Interactions

```css
/* Game clock with urgency indicators */
.game-clock {
  font-family: var(--font-mono);
  font-size: clamp(24px, 8vw, 72px);
  font-weight: 700;
  text-align: center;
  transition: color var(--game-clock-transition) ease-out;
}

.game-clock.running {
  color: var(--color-success);
}

.game-clock.paused {
  color: var(--color-warning);
  animation: clock-pulse 1.5s ease-in-out infinite;
}

.game-clock.urgent {
  color: var(--color-error);
  animation: clock-urgent 1s ease-in-out infinite;
}

@keyframes clock-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes clock-urgent {
  0%, 100% { 
    opacity: 1;
    text-shadow: 0 0 0 transparent;
  }
  50% { 
    opacity: 0.8;
    text-shadow: 0 0 10px var(--color-error);
  }
}

/* Clock control buttons */
.clock-controls {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

.clock-button {
  min-width: 120px;
  min-height: 48px;
  border-radius: 24px;
  font-weight: 600;
  transition: all var(--duration-fast) var(--ease-out-quart);
}

.clock-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.clock-button:active {
  transform: translateY(0);
  transition-duration: var(--duration-instant);
}

.clock-button.start {
  background: var(--color-success);
  color: var(--color-on-success);
}

.clock-button.pause {
  background: var(--color-warning);
  color: var(--color-on-warning);
}

.clock-button.stop {
  background: var(--color-error);
  color: var(--color-on-error);
}
```

### 2.3 Player Substitution Animations

```css
/* Substitution interface */
.substitution-manager {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding: 24px;
}

.player-list {
  border-radius: 12px;
  padding: 16px;
  transition: all var(--duration-normal) var(--ease-out-quart);
}

.player-list.on-court {
  background: var(--color-success-light);
  border: 2px solid var(--color-success);
}

.player-list.on-bench {
  background: var(--color-neutral-light);
  border: 2px solid var(--color-neutral);
}

/* Player cards */
.player-card {
  display: flex;
  align-items: center;
  padding: 12px;
  margin: 8px 0;
  background: var(--surface-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out-quart);
  border: 2px solid transparent;
}

.player-card:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary-light);
}

.player-card.selected {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  transform: scale(1.02);
}

.player-card.substituting-out {
  animation: player-exit 0.6s var(--ease-in-out-quart) forwards;
}

.player-card.substituting-in {
  animation: player-enter 0.6s var(--ease-in-out-quart) forwards;
}

@keyframes player-exit {
  0% {
    transform: translateX(0);
    opacity: 1;
  }
  50% {
    transform: translateX(-100px);
    opacity: 0.5;
  }
  100% {
    transform: translateX(-200px);
    opacity: 0;
  }
}

@keyframes player-enter {
  0% {
    transform: translateX(200px);
    opacity: 0;
  }
  50% {
    transform: translateX(50px);
    opacity: 0.5;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Substitution confirmation */
.substitution-preview {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.8);
  background: var(--surface-primary);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  opacity: 0;
  transition: all var(--duration-normal) var(--ease-out-expo);
}

.substitution-preview.visible {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.substitute-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin: 24px 0;
}

.player-out, .player-in {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border-radius: 12px;
  min-width: 120px;
}

.player-out {
  background: var(--color-error-light);
  color: var(--color-on-error);
}

.player-in {
  background: var(--color-success-light);
  color: var(--color-on-success);
}

.substitute-arrow {
  font-size: 24px;
  color: var(--color-primary);
  animation: arrow-pulse 1.5s ease-in-out infinite;
}

@keyframes arrow-pulse {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(8px); }
}
```

---

## 3. Core UI Interactions

### 3.1 Button Interactions

```css
/* Primary button with basketball-inspired feedback */
.btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 12px 24px;
  border-radius: 24px;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  overflow: hidden;
  transition: all var(--duration-fast) var(--ease-out-quart);
}

.btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width var(--duration-normal) var(--ease-out-expo),
              height var(--duration-normal) var(--ease-out-expo);
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn:active {
  transform: translateY(0);
  transition-duration: var(--duration-instant);
}

.btn:active::before {
  width: 300px;
  height: 300px;
}

.btn.primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.btn.success {
  background: var(--color-success);
  color: var(--color-on-success);
}

.btn.warning {
  background: var(--color-warning);
  color: var(--color-on-warning);
}

.btn.error {
  background: var(--color-error);
  color: var(--color-on-error);
}

/* Basketball-specific button styles */
.btn.scoring {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  min-width: 72px;
  min-height: 72px;
  border-radius: 50%;
  font-size: 18px;
  font-weight: 700;
}

.btn.scoring:active {
  animation: basketball-bounce var(--duration-normal) var(--ease-basketball);
}

.btn.emergency {
  background: var(--color-error);
  color: var(--color-on-error);
  min-width: 80px;
  min-height: 80px;
  border-radius: 50%;
  font-size: 24px;
  animation: emergency-pulse 2s ease-in-out infinite;
}

@keyframes emergency-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 var(--color-error);
  }
  50% {
    box-shadow: 0 0 0 20px transparent;
  }
}

/* Loading state */
.btn.loading {
  pointer-events: none;
  color: transparent;
}

.btn.loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: btn-spin 1s linear infinite;
}

@keyframes btn-spin {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
```

### 3.2 Card Interactions

```css
/* Interactive cards for team, player, and game information */
.card {
  background: var(--surface-primary);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--outline-variant);
  transition: all var(--duration-normal) var(--ease-out-quart);
  cursor: pointer;
  overflow: hidden;
  position: relative;
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  transition: left var(--duration-slow) var(--ease-out-quart);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: var(--color-primary-light);
}

.card:hover::before {
  left: 100%;
}

.card:active {
  transform: translateY(-2px);
  transition-duration: var(--duration-instant);
}

/* Basketball-specific cards */
.player-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--surface-primary);
  border-radius: 12px;
  padding: 16px;
  transition: all var(--duration-fast) var(--ease-out-quart);
}

.player-card:hover {
  background: var(--surface-secondary);
  transform: scale(1.02);
}

.player-photo {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  transition: transform var(--duration-fast) var(--ease-out-quart);
}

.player-card:hover .player-photo {
  transform: scale(1.1);
}

.game-card {
  position: relative;
  background: linear-gradient(135deg, var(--surface-primary), var(--surface-secondary));
  border: 2px solid transparent;
  transition: all var(--duration-normal) var(--ease-out-quart);
}

.game-card.live {
  border-color: var(--color-error);
  background: linear-gradient(135deg, var(--color-error-light), var(--surface-primary));
  animation: live-game-pulse 3s ease-in-out infinite;
}

@keyframes live-game-pulse {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  50% {
    box-shadow: 0 4px 20px var(--color-error-light);
  }
}

.game-card.scheduled {
  border-color: var(--color-info);
}

.game-card.completed {
  border-color: var(--color-success);
  opacity: 0.8;
}
```

### 3.3 Toggle and Switch Interactions

```css
/* Custom toggle switches for settings and preferences */
.toggle {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
  background: var(--surface-variant);
  border-radius: 14px;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out-quart);
}

.toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  background: var(--surface-primary);
  border-radius: 50%;
  transition: all var(--duration-normal) var(--ease-basketball);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle.checked {
  background: var(--color-primary);
}

.toggle.checked::after {
  left: 26px;
  background: var(--color-on-primary);
}

.toggle:active::after {
  width: 28px;
}

/* Basketball-themed toggle for game features */
.basketball-toggle {
  width: 60px;
  height: 32px;
  background: var(--basketball-court);
  border: 2px solid var(--basketball-lines);
  border-radius: 16px;
  position: relative;
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-out-quart);
}

.basketball-toggle::after {
  content: '🏀';
  position: absolute;
  top: 50%;
  left: 4px;
  transform: translateY(-50%);
  font-size: 18px;
  transition: all var(--duration-normal) var(--ease-basketball);
}

.basketball-toggle.checked::after {
  left: calc(100% - 24px);
  transform: translateY(-50%) rotate(180deg);
}

/* Radio buttons and checkboxes */
.radio-group {
  display: flex;
  gap: 16px;
  margin: 16px 0;
}

.radio-item {
  position: relative;
  cursor: pointer;
}

.radio-input {
  position: absolute;
  opacity: 0;
}

.radio-label {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border: 2px solid var(--outline);
  border-radius: 24px;
  background: var(--surface-primary);
  transition: all var(--duration-fast) var(--ease-out-quart);
}

.radio-input:checked + .radio-label {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  transform: scale(1.05);
}

.radio-label:hover {
  border-color: var(--color-primary-light);
  transform: translateY(-1px);
}
```

---

## 4. Form Interactions

### 4.1 Input Field Interactions

```css
/* Enhanced form inputs for basketball registration and data entry */
.form-group {
  position: relative;
  margin-bottom: 24px;
}

.form-input {
  width: 100%;
  height: 56px;
  padding: 16px 16px 8px;
  border: 2px solid var(--outline);
  border-radius: 8px;
  background: var(--surface-primary);
  font-size: 16px;
  transition: all var(--duration-fast) var(--ease-out-quart);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px var(--color-primary-light);
}

.form-input:invalid:not(:placeholder-shown) {
  border-color: var(--color-error);
  box-shadow: 0 0 0 4px var(--color-error-light);
}

.form-input:valid:not(:placeholder-shown) {
  border-color: var(--color-success);
}

/* Floating labels */
.form-label {
  position: absolute;
  top: 16px;
  left: 16px;
  color: var(--text-secondary);
  font-size: 16px;
  pointer-events: none;
  transition: all var(--duration-fast) var(--ease-out-quart);
  background: var(--surface-primary);
  padding: 0 4px;
}

.form-input:focus + .form-label,
.form-input:not(:placeholder-shown) + .form-label {
  top: -8px;
  left: 12px;
  font-size: 12px;
  color: var(--color-primary);
  font-weight: 600;
}

/* Basketball-specific inputs */
.jersey-number-input {
  width: 80px;
  height: 80px;
  text-align: center;
  font-size: 24px;
  font-weight: 700;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: var(--color-on-primary);
  border: none;
}

.jersey-number-input:focus {
  box-shadow: 0 0 0 4px var(--color-primary-light);
  transform: scale(1.1);
}

/* Position selector */
.position-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.position-option {
  position: relative;
  cursor: pointer;
}

.position-input {
  position: absolute;
  opacity: 0;
}

.position-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border: 2px solid var(--outline);
  border-radius: 12px;
  background: var(--surface-primary);
  transition: all var(--duration-fast) var(--ease-out-quart);
  text-align: center;
}

.position-input:checked + .position-label {
  background: var(--color-primary);
  color: var(--color-on-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.position-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.position-name {
  font-size: 12px;
  font-weight: 600;
}
```

### 4.2 Form Validation Feedback

```css
/* Error state animations */
.form-group.error .form-input {
  animation: input-error var(--duration-normal) var(--ease-out-quart);
}

@keyframes input-error {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: var(--color-error);
  font-size: 14px;
  opacity: 0;
  transform: translateY(-8px);
  transition: all var(--duration-fast) var(--ease-out-quart);
}

.error-message.visible {
  opacity: 1;
  transform: translateY(0);
}

.error-icon {
  flex-shrink: 0;
  animation: error-icon-pulse 1.5s ease-in-out infinite;
}

@keyframes error-icon-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Success state */
.form-group.success .form-input {
  border-color: var(--color-success);
  animation: input-success var(--duration-normal) var(--ease-out-quart);
}

@keyframes input-success {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

.success-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: var(--color-success);
  font-size: 14px;
  opacity: 0;
  transform: translateY(-8px);
  transition: all var(--duration-fast) var(--ease-out-quart);
}

.success-message.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### 4.3 Multi-step Form Progress

```css
/* Registration wizard progress indicator */
.form-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 24px 0;
  padding: 20px;
}

.progress-steps {
  display: flex;
  align-items: center;
  gap: 16px;
}

.progress-step {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--surface-variant);
  color: var(--text-secondary);
  font-weight: 600;
  transition: all var(--duration-normal) var(--ease-out-quart);
}

.progress-step.completed {
  background: var(--color-success);
  color: var(--color-on-success);
  animation: step-complete var(--duration-normal) var(--ease-basketball);
}

.progress-step.active {
  background: var(--color-primary);
  color: var(--color-on-primary);
  transform: scale(1.2);
  box-shadow: 0 0 0 4px var(--color-primary-light);
}

.progress-step.pending {
  background: var(--surface-variant);
  color: var(--text-disabled);
}

@keyframes step-complete {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.progress-connector {
  width: 32px;
  height: 4px;
  background: var(--surface-variant);
  border-radius: 2px;
  transition: background var(--duration-normal) var(--ease-out-quart);
}

.progress-connector.completed {
  background: var(--color-success);
  animation: connector-fill var(--duration-slow) var(--ease-out-quart);
}

@keyframes connector-fill {
  0% { width: 0; }
  100% { width: 32px; }
}

.step-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 12px;
  color: var(--text-secondary);
}

.step-label.active {
  color: var(--color-primary);
  font-weight: 600;
}
```

---

## 5. Navigation Patterns

### 5.1 Mobile Navigation

```css
/* Bottom tab navigation for mobile */
.bottom-navigation {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  background: var(--surface-primary);
  border-top: 1px solid var(--outline-variant);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 48px;
  padding: 8px 12px;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 12px;
  transition: all var(--duration-fast) var(--ease-out-quart);
  position: relative;
  overflow: hidden;
}

.nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-primary);
  transform: translateY(-2px);
  transition: transform var(--duration-fast) var(--ease-out-quart);
}

.nav-item.active {
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.nav-item.active::before {
  transform: translateY(0);
}

.nav-icon {
  font-size: 20px;
  margin-bottom: 4px;
  transition: transform var(--duration-fast) var(--ease-out-quart);
}

.nav-item:active .nav-icon {
  transform: scale(1.2);
}

.nav-label {
  font-size: 10px;
  font-weight: 500;
  line-height: 1;
}

.nav-badge {
  position: absolute;
  top: 4px;
  right: 8px;
  min-width: 18px;
  height: 18px;
  background: var(--color-error);
  color: var(--color-on-error);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  animation: badge-bounce var(--duration-normal) var(--ease-basketball);
}

@keyframes badge-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}
```

### 5.2 Slide-out Navigation

```css
/* Side navigation drawer */
.navigation-drawer {
  position: fixed;
  top: 0;
  left: -320px;
  width: 320px;
  height: 100vh;
  background: var(--surface-primary);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  transition: transform var(--duration-normal) var(--ease-out-quart);
  z-index: 1000;
  overflow-y: auto;
}

.navigation-drawer.open {
  transform: translateX(320px);
}

.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--duration-normal) var(--ease-out-quart);
  z-index: 999;
}

.drawer-overlay.visible {
  opacity: 1;
  pointer-events: all;
}

.drawer-header {
  padding: 24px;
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.drawer-content {
  padding: 16px 0;
}

.drawer-item {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  color: var(--text-primary);
  text-decoration: none;
  transition: all var(--duration-fast) var(--ease-out-quart);
  border-left: 4px solid transparent;
}

.drawer-item:hover {
  background: var(--surface-secondary);
  border-left-color: var(--color-primary-light);
}

.drawer-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-left-color: var(--color-primary);
}

.drawer-icon {
  margin-right: 16px;
  font-size: 20px;
}

.drawer-label {
  font-weight: 500;
}
```

### 5.3 Breadcrumb Navigation

```css
/* Breadcrumb navigation for deep hierarchies */
.breadcrumb {
  display: flex;
  align-items: center;
  padding: 16px 0;
  margin-bottom: 24px;
  font-size: 14px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.breadcrumb::-webkit-scrollbar {
  display: none;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  white-space: nowrap;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-out-quart);
}

.breadcrumb-item:hover {
  color: var(--color-primary);
}

.breadcrumb-item.current {
  color: var(--text-primary);
  font-weight: 600;
}

.breadcrumb-separator {
  margin: 0 12px;
  color: var(--text-disabled);
  font-size: 12px;
}

/* Basketball-themed breadcrumbs */
.basketball-breadcrumb .breadcrumb-separator {
  content: '🏀';
  font-size: 10px;
}
```

---

## 6. Feedback Systems

### 6.1 Toast Notifications

```css
/* Toast notification system */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  max-width: 400px;
  width: 100%;
}

@media (max-width: 480px) {
  .toast-container {
    top: auto;
    bottom: 100px;
    left: 16px;
    right: 16px;
    max-width: none;
  }
}

.toast {
  display: flex;
  align-items: center;
  padding: 16px;
  margin-bottom: 12px;
  background: var(--surface-primary);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-left: 4px solid var(--color-info);
  transform: translateX(400px);
  transition: all var(--duration-normal) var(--ease-out-expo);
  opacity: 0;
}

.toast.visible {
  transform: translateX(0);
  opacity: 1;
}

.toast.success {
  border-left-color: var(--color-success);
}

.toast.warning {
  border-left-color: var(--color-warning);
}

.toast.error {
  border-left-color: var(--color-error);
}

.toast-icon {
  flex-shrink: 0;
  margin-right: 12px;
  font-size: 20px;
}

.toast.success .toast-icon {
  color: var(--color-success);
  animation: success-bounce var(--duration-normal) var(--ease-basketball);
}

.toast.error .toast-icon {
  color: var(--color-error);
  animation: error-shake var(--duration-normal) var(--ease-out-quart);
}

@keyframes success-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}

@keyframes error-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.toast-message {
  font-size: 14px;
  color: var(--text-secondary);
}

.toast-close {
  flex-shrink: 0;
  margin-left: 12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: var(--surface-variant);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out-quart);
}

.toast-close:hover {
  background: var(--surface-secondary);
  color: var(--text-primary);
}
```

#### JavaScript Toast System

```javascript
class ToastManager {
  constructor() {
    this.container = document.getElementById('toast-container');
    this.toasts = [];
  }
  
  show(message, type = 'info', duration = 5000) {
    const toast = this.createToast(message, type);
    this.container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('visible'), 10);
    
    // Auto-remove
    const timeout = setTimeout(() => this.remove(toast), duration);
    
    // Store reference
    this.toasts.push({ element: toast, timeout });
    
    return toast;
  }
  
  createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '✅',
      error: '❌', 
      warning: '⚠️',
      info: 'ℹ️',
      basketball: '🏀'
    };
    
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close notification">×</button>
    `;
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      this.remove(toast);
    });
    
    return toast;
  }
  
  remove(toast) {
    toast.classList.remove('visible');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
    
    // Clean up reference
    this.toasts = this.toasts.filter(t => t.element !== toast);
  }
  
  // Basketball-specific notifications
  scoreUpdate(team, points) {
    this.show(`${team} scores ${points} points! 🏀`, 'basketball', 3000);
  }
  
  gameEvent(message) {
    this.show(message, 'info', 4000);
  }
  
  emergency(message) {
    this.show(`🚨 ${message}`, 'error', 10000);
  }
}
```

### 6.2 Progress Indicators

```css
/* Loading and progress indicators */
.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--surface-variant);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
  border-radius: 4px;
  transition: width var(--duration-normal) var(--ease-out-quart);
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3));
  animation: progress-shimmer 1.5s ease-in-out infinite;
}

@keyframes progress-shimmer {
  0% { transform: translateX(-20px); }
  100% { transform: translateX(20px); }
}

/* Basketball-themed progress */
.basketball-progress {
  height: 12px;
  background: var(--basketball-court);
  border: 2px solid var(--basketball-lines);
  position: relative;
}

.basketball-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-success));
  position: relative;
}

.basketball-progress-ball {
  position: absolute;
  top: 50%;
  right: -8px;
  transform: translateY(-50%);
  font-size: 16px;
  animation: ball-bounce 1.5s ease-in-out infinite;
}

@keyframes ball-bounce {
  0%, 100% { transform: translateY(-50%) translateX(0); }
  50% { transform: translateY(-70%) translateX(-4px); }
}

/* Circular progress for timers */
.circular-progress {
  position: relative;
  width: 80px;
  height: 80px;
  transform: rotate(-90deg);
}

.circular-progress-track {
  fill: none;
  stroke: var(--surface-variant);
  stroke-width: 8;
}

.circular-progress-fill {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 226;
  stroke-dashoffset: 226;
  transition: stroke-dashoffset var(--duration-normal) var(--ease-out-quart);
}

.circular-progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(90deg);
  font-weight: 600;
  font-family: var(--font-mono);
}
```

### 6.3 Confirmation Dialogs

```css
/* Modal confirmation dialogs */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--duration-normal) var(--ease-out-quart);
}

.modal-overlay.visible {
  opacity: 1;
  pointer-events: all;
}

.modal {
  background: var(--surface-primary);
  border-radius: 16px;
  padding: 32px;
  max-width: 400px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  transform: scale(0.9) translateY(40px);
  transition: all var(--duration-normal) var(--ease-out-expo);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal-overlay.visible .modal {
  transform: scale(1) translateY(0);
}

.modal-header {
  text-align: center;
  margin-bottom: 24px;
}

.modal-icon {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.modal-icon.warning {
  color: var(--color-warning);
  animation: warning-pulse 1.5s ease-in-out infinite;
}

.modal-icon.error {
  color: var(--color-error);
  animation: error-pulse 1.5s ease-in-out infinite;
}

@keyframes warning-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes error-pulse {
  0%, 100% { 
    transform: scale(1);
    filter: brightness(1);
  }
  50% { 
    transform: scale(1.05);
    filter: brightness(1.2);
  }
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.modal-message {
  color: var(--text-secondary);
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
}

.modal-actions .btn {
  min-width: 100px;
}

/* Basketball-specific confirmation */
.basketball-confirm .modal-icon {
  animation: basketball-spin 2s ease-in-out infinite;
}

@keyframes basketball-spin {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(180deg); }
}
```

---

## 7. Loading & State Transitions

### 7.1 Skeleton Loading

```css
/* Skeleton loading screens for content */
.skeleton {
  background: linear-gradient(90deg, 
    var(--surface-secondary) 25%, 
    var(--surface-variant) 50%, 
    var(--surface-secondary) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 4px;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-text {
  height: 16px;
  margin: 8px 0;
}

.skeleton-text.large {
  height: 24px;
}

.skeleton-text.small {
  height: 12px;
  width: 60%;
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.skeleton-button {
  height: 48px;
  width: 120px;
  border-radius: 24px;
}

/* Basketball-specific skeletons */
.skeleton-scoreboard {
  height: 80px;
  border-radius: 12px;
  margin: 16px 0;
}

.skeleton-player-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: var(--surface-secondary);
}

.skeleton-game-card {
  height: 120px;
  border-radius: 12px;
  background: linear-gradient(135deg, 
    var(--surface-secondary), 
    var(--surface-variant)
  );
}
```

### 7.2 Page Transitions

```css
/* Page transition animations */
.page-transition-enter {
  opacity: 0;
  transform: translateX(20px);
}

.page-transition-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: all var(--duration-normal) var(--ease-out-expo);
}

.page-transition-exit {
  opacity: 1;
  transform: translateX(0);
}

.page-transition-exit-active {
  opacity: 0;
  transform: translateX(-20px);
  transition: all var(--duration-fast) var(--ease-out-quart);
}

/* Basketball-themed page transitions */
.basketball-page-enter {
  opacity: 0;
  transform: translateY(40px) scale(0.95);
}

.basketball-page-enter-active {
  opacity: 1;
  transform: translateY(0) scale(1);
  transition: all var(--duration-normal) var(--ease-basketball);
}

/* Route-specific transitions */
.route-dashboard.enter {
  animation: dashboard-enter var(--duration-normal) var(--ease-out-expo);
}

.route-live-game.enter {
  animation: live-game-enter var(--court-animation) var(--ease-out-expo);
}

@keyframes dashboard-enter {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes live-game-enter {
  0% {
    opacity: 0;
    transform: scale(1.1);
    filter: blur(4px);
  }
  100% {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
}
```

### 7.3 Data Loading States

```css
/* Smart loading states that show contextual information */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 40px;
  text-align: center;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--surface-variant);
  border-top: 4px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-message {
  color: var(--text-secondary);
  font-size: 16px;
}

/* Basketball loading animations */
.basketball-loading {
  position: relative;
  width: 60px;
  height: 60px;
  margin-bottom: 16px;
}

.basketball-loading::before {
  content: '🏀';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  animation: basketball-spin 1.5s ease-in-out infinite;
}

/* Court loading pattern */
.court-loading {
  width: 120px;
  height: 80px;
  background: var(--basketball-court);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
}

.court-loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: court-sweep 1.5s ease-in-out infinite;
}

@keyframes court-sweep {
  0% { left: -100%; }
  100% { left: 100%; }
}

/* Error states */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 40px;
  text-align: center;
}

.error-icon {
  font-size: 48px;
  color: var(--color-error);
  margin-bottom: 16px;
  animation: error-wobble 1.5s ease-in-out infinite;
}

@keyframes error-wobble {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg); }
  75% { transform: rotate(5deg); }
}

.error-message {
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.error-description {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 24px;
}

.error-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}
```

---

## 8. Accessibility Considerations

### 8.1 Reduced Motion Support

```css
/* Provide alternatives for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  /* Essential feedback still provided through color/opacity */
  .btn:hover {
    background-color: var(--color-primary-dark);
  }
  
  .card:hover {
    background-color: var(--surface-secondary);
  }
  
  .score-value.updating {
    background-color: var(--color-success-light);
    color: var(--color-success);
  }
  
  .live-indicator {
    opacity: 0.8;
  }
  
  /* Loading states without animation */
  .loading-spinner {
    animation: none;
    border-top-color: var(--color-primary);
    transform: rotate(45deg);
  }
  
  .basketball-loading::before {
    animation: none;
    opacity: 0.8;
  }
}
```

### 8.2 Focus Management

```css
/* Enhanced focus indicators for keyboard navigation */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

.btn:focus-visible {
  outline-offset: 4px;
  box-shadow: 0 0 0 4px var(--color-primary-light);
}

.card:focus-visible {
  outline-offset: 4px;
  transform: translateY(-2px);
}

.form-input:focus-visible {
  outline: none; /* Handled by form styles */
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :focus-visible {
    outline-width: 3px;
    outline-color: currentColor;
  }
  
  .btn {
    border: 2px solid currentColor;
  }
  
  .card {
    border: 1px solid currentColor;
  }
}

/* Basketball-specific focus styles */
.scoring-button:focus-visible {
  outline: 3px solid var(--color-warning);
  outline-offset: 4px;
  box-shadow: 0 0 0 6px rgba(255, 152, 0, 0.3);
}

.emergency-button:focus-visible {
  outline: 3px solid var(--color-on-error);
  outline-offset: 4px;
  box-shadow: 0 0 0 8px rgba(244, 67, 54, 0.4);
}
```

### 8.3 Screen Reader Announcements

```css
/* Hidden content for screen readers */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sr-only-focusable:active,
.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}

/* Live regions for dynamic content */
.live-announcer {
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

/* Basketball-specific screen reader content */
.score-announcer {
  /* Hidden live region for score updates */
  @extend .live-announcer;
}

.game-announcer {
  /* Hidden live region for game events */
  @extend .live-announcer;
}
```

---

## Implementation Guidelines

### Performance Optimization

```javascript
// Animation performance utilities
class AnimationManager {
  constructor() {
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.animationFrame = null;
  }
  
  animate(element, keyframes, options) {
    if (this.prefersReducedMotion) {
      // Apply final state immediately
      const finalFrame = keyframes[keyframes.length - 1];
      Object.assign(element.style, finalFrame);
      return Promise.resolve();
    }
    
    return element.animate(keyframes, {
      duration: 250,
      easing: 'ease-out',
      fill: 'forwards',
      ...options
    }).finished;
  }
  
  requestAnimationFrame(callback) {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    this.animationFrame = requestAnimationFrame(callback);
  }
  
  // Basketball-specific animations
  celebrateScore(scoreElement, points) {
    if (this.prefersReducedMotion) {
      scoreElement.style.color = 'var(--color-success)';
      setTimeout(() => {
        scoreElement.style.color = '';
      }, 1000);
      return;
    }
    
    return this.animate(scoreElement, [
      { transform: 'scale(1)', color: 'var(--text-primary)' },
      { transform: 'scale(1.2)', color: 'var(--color-success)', offset: 0.5 },
      { transform: 'scale(1)', color: 'var(--text-primary)' }
    ], {
      duration: 600,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    });
  }
  
  bounceButton(button) {
    if (this.prefersReducedMotion) {
      button.style.opacity = '0.8';
      setTimeout(() => {
        button.style.opacity = '';
      }, 100);
      return;
    }
    
    return this.animate(button, [
      { transform: 'scale(1)' },
      { transform: 'scale(0.95)', offset: 0.5 },
      { transform: 'scale(1)' }
    ], {
      duration: 150
    });
  }
}

// Initialize animation manager
window.animationManager = new AnimationManager();
```

### Touch Interaction Handling

```javascript
// Enhanced touch interactions for basketball interface
class TouchManager {
  constructor(element) {
    this.element = element;
    this.touchStart = null;
    this.touchThreshold = 10; // pixels
    this.longPressThreshold = 500; // ms
    this.bindEvents();
  }
  
  bindEvents() {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: true });
  }
  
  handleTouchStart(e) {
    this.touchStart = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
    
    // Visual feedback
    this.element.classList.add('touch-active');
    
    // Long press detection
    this.longPressTimer = setTimeout(() => {
      this.handleLongPress(e);
    }, this.longPressThreshold);
  }
  
  handleTouchMove(e) {
    if (!this.touchStart) return;
    
    const deltaX = Math.abs(e.touches[0].clientX - this.touchStart.x);
    const deltaY = Math.abs(e.touches[0].clientY - this.touchStart.y);
    
    if (deltaX > this.touchThreshold || deltaY > this.touchThreshold) {
      // Cancel tap if moved too much
      this.cancelTouch();
    }
  }
  
  handleTouchEnd(e) {
    if (!this.touchStart) return;
    
    const touchDuration = Date.now() - this.touchStart.time;
    
    if (touchDuration < this.longPressThreshold) {
      // Regular tap
      this.handleTap(e);
    }
    
    this.cleanup();
  }
  
  handleTouchCancel(e) {
    this.cancelTouch();
  }
  
  handleTap(e) {
    // Dispatch custom tap event
    this.element.dispatchEvent(new CustomEvent('tap', {
      detail: { originalEvent: e }
    }));
  }
  
  handleLongPress(e) {
    // Dispatch custom long press event
    this.element.dispatchEvent(new CustomEvent('longpress', {
      detail: { originalEvent: e }
    }));
  }
  
  cancelTouch() {
    this.element.classList.remove('touch-active');
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
    this.cleanup();
  }
  
  cleanup() {
    this.touchStart = null;
    this.element.classList.remove('touch-active');
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
}
```

This comprehensive interaction patterns and micro-animations specification ensures the Basketball League Management Platform provides delightful, accessible, and performant user experiences across all devices and user capabilities while maintaining the sports context and multi-generational appeal.

---

**Interaction Patterns Status**: Complete  
**Next Phase**: Style Guide Development  
**Dependencies**: Design system, component library, accessibility guidelines  
**Review Required**: UX team, development team, accessibility specialists