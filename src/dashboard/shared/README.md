# Dashboard Shared Styles

This directory contains shared CSS styles for all dashboard HTML files in the LSH project.

## Quick Start

### 1. Include the Shared Stylesheet

Add this line to the `<head>` section of your dashboard HTML file:

```html
<link rel="stylesheet" href="/dashboard/shared/styles.css">
```

### 2. Use Design Tokens (CSS Variables)

Instead of hardcoding colors, use the design tokens:

```css
/* ❌ Don't do this */
.my-card {
  background: #1e293b;
  color: #e2e8f0;
}

/* ✅ Do this instead */
.my-card {
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
}
```

### 3. Leverage Common Classes

Use existing utility classes instead of writing new CSS:

```html
<!-- Cards -->
<div class="card">...</div>
<div class="metric-card">...</div>
<div class="analytics-card">...</div>

<!-- Buttons -->
<button class="button-primary">Save</button>
<button class="button-secondary">Cancel</button>

<!-- Status Badges -->
<span class="status-badge running">Running</span>
<span class="status-badge completed">Completed</span>

<!-- Grids -->
<div class="metrics-grid">...</div>
<div class="stats-grid">...</div>
```

## Available Components

### Navigation
- `.nav-header` - Standard navigation header
- `.navbar` - White glassmorphism navbar
- `.nav-container` - Max-width container for nav
- `.nav-links` - Navigation link container
- `.nav-link` - Individual navigation link

### Cards
- `.card` - Standard card with glassmorphism
- `.metric-card` - Metric display card (dark theme)
- `.analytics-card` - Analytics card with backdrop blur
- `.detail-card` - Detail information card
- `.stat-card` - Statistic card with accent bar

### Headers
- `.header` - Page header with title
- `.hero-section` - Hero banner section
- `.card-header` - Card header with title

### Grids
- `.metrics-grid` - Responsive metrics grid (250px min)
- `.analytics-grid` - Analytics grid (350px min)
- `.stats-grid` - Statistics grid (280px min)
- `.dashboard-grid` - Dashboard card grid (300px min)

### Status Badges
- `.status-badge` - Base badge style
- `.status-badge.running` - Running status
- `.status-badge.completed` - Completed status
- `.status-badge.failed` - Failed status
- `.status-badge.queued` - Queued status

### Buttons
- `.button-primary` - Primary action button
- `.button-secondary` - Secondary action button
- `.button-danger` - Destructive action button
- `.filter-button` - Filter/toggle button
- `.period-button` - Period selector button

### Forms
- `.form-group` - Form field container
- `.form-label` - Form field label
- `.form-input` - Text input
- `.form-select` - Select dropdown
- `.form-textarea` - Textarea input

### Utility States
- `.loading` - Loading container
- `.spinner` - Loading spinner animation
- `.empty-state` - Empty state message
- `.notification` - Toast notification
- `.error-message` - Error alert message

## Design Tokens (CSS Variables)

### Colors

#### Primary Colors
```css
--color-primary: #667eea
--color-primary-dark: #764ba2
--color-secondary: #3b82f6
```

#### Status Colors
```css
--color-success: #48bb78
--color-warning: #f59e0b
--color-error: #ef4444
--color-info: #4299e1
```

#### Neutral Colors
```css
--color-bg-dark: #0f172a
--color-bg-card: #1e293b
--color-border: #334155
--color-text-primary: #f1f5f9
--color-text-secondary: #e2e8f0
--color-text-muted: #94a3b8
```

### Spacing
```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 12px
--spacing-lg: 16px
--spacing-xl: 20px
--spacing-xxl: 24px
--spacing-xxxl: 32px
```

### Border Radius
```css
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
--radius-xxl: 20px
--radius-pill: 50px
```

### Shadows
```css
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1)
--shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.1)
--shadow-xl: 0 20px 40px rgba(0, 0, 0, 0.3)
```

### Transitions
```css
--transition-fast: 0.2s ease
--transition-normal: 0.3s ease
--transition-slow: 0.5s ease
```

## Common Patterns

### 1. Card with Hover Effect
```html
<div class="metric-card">
  <div class="metric-label">Total Jobs</div>
  <div class="metric-value">42</div>
  <div class="metric-subtitle">Last 24 hours</div>
</div>
```

### 2. Status Badge
```html
<span class="status-badge running">Running</span>
```

### 3. Button Group
```html
<div class="action-buttons">
  <button class="button-primary">Execute</button>
  <button class="button-secondary">Cancel</button>
</div>
```

### 4. Responsive Grid
```html
<div class="metrics-grid">
  <div class="metric-card">...</div>
  <div class="metric-card">...</div>
  <div class="metric-card">...</div>
</div>
```

### 5. Loading State
```html
<div class="loading">
  <div class="spinner"></div>
  Loading data...
</div>
```

### 6. Notification Toast
```html
<div class="notification success show">
  <i class="fas fa-check-circle"></i>
  Operation completed successfully
</div>
```

## Overriding Styles

If you need dashboard-specific styles, add them AFTER the shared stylesheet:

```html
<head>
  <link rel="stylesheet" href="/dashboard/shared/styles.css">
  <style>
    /* Dashboard-specific overrides */
    .metric-card {
      background: linear-gradient(135deg, #custom-color, #another-color);
    }
  </style>
</head>
```

## Best Practices

### ✅ Do:
- Use CSS variables for colors, spacing, and other design tokens
- Leverage existing utility classes before writing custom CSS
- Keep dashboard-specific styles minimal and focused
- Use semantic class names that describe purpose, not appearance
- Test responsive behavior on mobile devices

### ❌ Don't:
- Hardcode colors, spacing, or other design values
- Modify the shared stylesheet without testing all dashboards
- Use inline styles (except for dynamic JavaScript-generated styles)
- Override too many shared styles (consider if your dashboard needs a different approach)
- Create duplicate utility classes

## File Structure

```
src/dashboard/shared/
├── styles.css          # Main shared stylesheet
├── README.md          # This file - usage guide
└── ANALYSIS.md        # Detailed analysis report
```

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (with minor degradation for backdrop-filter)
- IE11: ⚠️ Partial support (CSS variables not supported)

## Performance

The shared stylesheet is:
- **Cached** across all dashboards (load once, use everywhere)
- **Minified** in production builds
- **~950 lines** of reusable styles
- **Reduces duplication** by ~75% compared to inline styles

## Maintenance

When updating shared styles:
1. Update `styles.css`
2. Test changes in **all 7 dashboards**:
   - `/cicd/dashboard/index.html`
   - `/cicd/dashboard/admin.html`
   - `/cicd/dashboard/analytics.html`
   - `/pipeline/dashboard/index.html`
   - `/pipeline/dashboard/hub.html`
   - `/pipeline/dashboard/job-detail.html`
   - `/pipeline/dashboard/workflow.html`
3. Document significant changes in `ANALYSIS.md`
4. Update this README if new components are added

## Examples

See the detailed analysis report (`ANALYSIS.md`) for:
- Complete style inventory
- Duplication statistics
- Migration guide
- Future enhancement recommendations

## Contributing

When adding new reusable styles:
1. Check if similar pattern exists
2. Use design tokens (CSS variables)
3. Add documentation to this README
4. Test across multiple dashboards
5. Consider accessibility (WCAG AA)

## Questions?

Contact the development team or refer to:
- `ANALYSIS.md` - Comprehensive analysis and metrics
- Project documentation - Architecture overview
- Design system guide - Component patterns

---

**Last Updated:** 2025-10-13
**Version:** 1.0.0
**Dashboards:** 7 HTML files
**Lines:** ~950 lines of shared CSS
