# Accessibility Testing Guide

This guide provides comprehensive instructions for testing the accessibility features implemented in the onboarding system.

## Overview

The onboarding system has been built with full WCAG 2.1 AA compliance and includes extensive accessibility features:

- ✅ **Theme Integration**: Dark/light mode with proper contrast ratios
- ✅ **Keyboard Navigation**: Full keyboard support for all interactions
- ✅ **Screen Reader Support**: ARIA landmarks, live regions, and announcements
- ✅ **Focus Management**: Proper focus indicators and trap patterns
- ✅ **Reduced Motion**: Respects user motion preferences
- ✅ **Color Contrast**: All critical combinations meet WCAG 2.1 AA standards

## Automated Testing

### Running Accessibility Tests

```bash
# Validate color contrast for both themes
npm run test:contrast

# Run full accessibility audit
npm run test:accessibility

# Start development with accessibility monitoring
npm run dev:a11y
```

### Color Contrast Validation

The system includes automated contrast validation:

```bash
node scripts/validate-theme-contrast.js
```

**Results Summary:**
- Light theme: 7/7 critical combinations pass ✅
- Dark theme: 7/7 critical combinations pass ✅
- Overall WCAG compliance: PASS ✅

## Manual Testing Procedures

### 1. Keyboard Navigation Testing

Test all onboarding steps using only the keyboard:

#### Basic Navigation
- **Tab**: Move forward through focusable elements
- **Shift + Tab**: Move backward through focusable elements
- **Enter/Space**: Activate buttons and controls
- **Escape**: Exit modals or return to previous step
- **Ctrl + →**: Navigate to next step (custom shortcut)
- **Ctrl + ←**: Navigate to previous step (custom shortcut)

#### Checklist
- [ ] All interactive elements are reachable via Tab
- [ ] Focus indicators are clearly visible
- [ ] Tab order follows logical sequence
- [ ] No keyboard traps (can navigate out of all areas)
- [ ] Skip links work (press Tab on page load)
- [ ] Form validation works with keyboard input
- [ ] Modal dialogs trap focus properly

### 2. Screen Reader Testing

Test with multiple screen readers to ensure compatibility:

#### NVDA (Windows)
1. Download NVDA (free): https://www.nvaccess.org/
2. Start NVDA and navigate to the onboarding
3. Use these commands:
   - **Ctrl**: Stop reading
   - **Insert + Space**: Browse mode toggle
   - **H**: Navigate by headings
   - **F**: Navigate by form fields
   - **B**: Navigate by buttons

#### VoiceOver (macOS)
1. Enable: System Preferences > Accessibility > VoiceOver
2. Use these commands:
   - **VO + Arrow Keys**: Navigate elements
   - **VO + Space**: Activate elements
   - **VO + Shift + Down**: Enter groups
   - **VO + Shift + Up**: Exit groups

#### TalkBack (Android)
1. Enable: Settings > Accessibility > TalkBack
2. Use swipe gestures to navigate
3. Double-tap to activate elements

#### Testing Checklist
- [ ] Page structure is announced clearly
- [ ] Step progress is communicated
- [ ] Form fields have clear labels
- [ ] Error messages are announced
- [ ] Success confirmations are heard
- [ ] Dynamic content changes are announced
- [ ] Navigation landmarks are identified

### 3. Visual Testing

#### Color Contrast
- [ ] Text is readable in both light and dark themes
- [ ] Focus indicators are visible
- [ ] Error states are clear
- [ ] Disabled states are apparent

#### Responsive Design
- [ ] All functionality works at 200% zoom
- [ ] Touch targets are at least 44x44px
- [ ] Content doesn't overflow containers
- [ ] Focus indicators remain visible

### 4. Motor Accessibility Testing

#### Mouse/Touch Alternatives
- [ ] All functionality available via keyboard
- [ ] Large touch targets on mobile
- [ ] Drag and drop has keyboard alternatives
- [ ] No timing-dependent interactions

#### Motion Sensitivity
- [ ] Animations respect `prefers-reduced-motion`
- [ ] No auto-playing videos or animations
- [ ] Parallax effects are minimal
- [ ] Essential animations remain for feedback

## Browser Testing

Test across multiple browsers and assistive technologies:

### Desktop Browsers
- [ ] Chrome + NVDA
- [ ] Firefox + NVDA
- [ ] Safari + VoiceOver
- [ ] Edge + NVDA

### Mobile Browsers
- [ ] Safari iOS + VoiceOver
- [ ] Chrome Android + TalkBack
- [ ] Samsung Internet + Voice Assistant

## Common Issues and Solutions

### Issue: Elements not announced by screen reader
**Solution**: Check for proper ARIA labels and roles

```tsx
// Bad
<div onClick={handleClick}>Click me</div>

// Good
<button
  onClick={handleClick}
  aria-label="Continue to next step"
>
  Click me
</button>
```

### Issue: Keyboard navigation skips elements
**Solution**: Ensure proper tabIndex and remove negative values

```tsx
// Bad
<div tabIndex="-1">Content</div>

// Good
<button tabIndex="0">Content</button>
```

### Issue: Dynamic content not announced
**Solution**: Use ARIA live regions

```tsx
// Good
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

## Development Guidelines

### Accessibility-First Development

1. **Start with semantic HTML**
2. **Add ARIA only when needed**
3. **Test with keyboard first**
4. **Validate with automated tools**
5. **Test with real assistive technology**

### Code Review Checklist

- [ ] All images have alt text or aria-hidden
- [ ] Forms have proper labels and error handling
- [ ] Color is not the only way to convey information
- [ ] Focus management works correctly
- [ ] Dynamic content has proper announcements
- [ ] Contrast ratios meet standards

## Resources

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension for accessibility testing
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation tool
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Built-in Chrome auditing
- [Color Oracle](https://colororacle.org/) - Color blindness simulator

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [A11y Project](https://www.a11yproject.com/) - Community-driven accessibility resources

### Testing Services
- [UsableNet](https://usablenet.com/) - Professional accessibility auditing
- [Deque](https://www.deque.com/) - Accessibility testing and training
- [Level Access](https://www.levelaccess.com/) - Compliance and testing services

## Reporting Issues

When reporting accessibility issues, include:

1. **Browser and version**
2. **Assistive technology used**
3. **Steps to reproduce**
4. **Expected vs actual behavior**
5. **WCAG guidelines affected**
6. **Severity level** (Critical/High/Medium/Low)

Example issue report:
```
Title: Form submission not announced to screen reader

Browser: Chrome 120 + NVDA 2023.3
Steps:
1. Navigate to company info step
2. Fill out required fields
3. Click "Continue" button
4. Listen for confirmation

Expected: Success message should be announced
Actual: No announcement, unclear if form submitted
WCAG: 4.1.3 Status Messages
Severity: High
```

## Maintenance

### Regular Testing Schedule
- **Weekly**: Automated contrast validation
- **Monthly**: Full keyboard navigation test
- **Quarterly**: Screen reader compatibility check
- **Before releases**: Complete accessibility audit

### Monitoring
- Enable development accessibility warnings
- Set up automated CI/CD accessibility checks
- Monitor user feedback and support requests
- Track accessibility metrics and improvements

This comprehensive testing approach ensures that all users, regardless of their abilities, can successfully complete the onboarding process.