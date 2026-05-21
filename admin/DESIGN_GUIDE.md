# Admin Dashboard Design Guide

## Overview

The EVA Monitor Admin Dashboard has been redesigned with a modern, fully responsive UI that provides an excellent user experience across all devices - desktop, tablet, and mobile.

## Key Design Features

### 1. **Modern Color Palette**
- **Primary**: `#667eea` (Purple) - Used for main actions and interactive elements
- **Secondary Colors**:
  - Success: `#10b981` (Green) - Positive metrics and confirmations
  - Warning: `#f59e0b` (Amber) - Caution and alerts
  - Danger: `#ef4444` (Red) - Critical issues and errors
  - Info: `#3b82f6` (Blue) - Informational elements

### 2. **Responsive Grid System**
- **Desktop Layout**: 260px fixed sidebar + main content area
- **Tablet (≤1200px)**: Sidebar shrinks to 220px
- **Mobile (≤768px)**: Sidebar becomes collapsible/off-canvas menu
- **Small Mobile (≤480px)**: Full-width stacking layout

### 3. **Component Library**

#### KPI Cards
- Color-coded top border indicators
- Large, readable typography
- Change indicators with positive/negative styling
- Responsive grid layout (4 columns → 2 columns → 1 column on small screens)

```html
<div class="kpi-card success">
  <div class="kpi-label">Total Cycles</div>
  <div class="kpi-value">1,234</div>
  <div class="kpi-change positive">↑ 12% from yesterday</div>
</div>
```

#### Data Tables
- Responsive horizontal scroll on mobile
- Proper header styling with uppercase labels
- Status badges and action buttons
- Pagination controls
- Empty state messaging

#### Cards with Headers
- Consistent padding and borders
- Header with title and subtitle
- Action buttons on the right
- Clear visual hierarchy

```html
<div class="card">
  <div class="card-header">
    <div>
      <h3 class="card-title">Page Title</h3>
      <p class="card-subtitle">Descriptive subtitle</p>
    </div>
  </div>
  <!-- Content -->
</div>
```

#### Forms
- Clean input styling with focus states
- Clear label hierarchy
- Consistent spacing and alignment
- Support for different input types

### 4. **Responsive Behavior**

#### Sidebar
- **Desktop**: Fixed 260px width, always visible
- **Tablet**: Reduced to 220px
- **Mobile**: Hidden by default, toggles with hamburger menu
  - Slides in from left
  - Semi-transparent backdrop
  - Closes on navigation or backdrop click

#### Top Navigation Bar
- Breadcrumbs for page location
- Right-aligned user menu
- Sticky positioning for always-visible access

#### Grids
- Grid-2: Auto-fits with 300px minimum
- Grid-3: Auto-fits with 250px minimum
- Grid-4: Auto-fits with 200px minimum
- Falls to 1 column on mobile

### 5. **Typography**

- **Font Family**: System fonts (Segoe UI, Roboto, San Francisco)
- **Page Titles**: 28px, weight 700
- **Card Titles**: 18px, weight 700
- **Labels**: 12px, weight 600, uppercase
- **Body**: 14px, weight 400-500

### 6. **Spacing System**

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
--spacing-xl: 24px;
--spacing-2xl: 32px;
```

### 7. **Shadows & Depth**

- **Shadow-sm**: Subtle, 1px elevation
- **Shadow**: Standard card shadow
- **Shadow-md**: Moderate elevation
- **Shadow-lg**: Prominent elevation
- **Shadow-xl**: Maximum elevation (modals, dropdowns)

## CSS Files

### `css/main.css`
Main stylesheet containing:
- CSS variables and design tokens
- Layout system (grid, flexbox)
- Sidebar and navigation styles
- Button and form component styles
- Utility classes
- Responsive media queries

### `css/dashboard.css`
Dashboard-specific styles:
- KPI row grid
- Chart containers
- Loading states and spinners

### `css/tables.css`
Table component styles:
- Table responsive wrapper
- Row and cell styling
- Status badges
- Action buttons
- Pagination
- Filter bar

## JavaScript Enhancements

### `js/app.js` Features
- Responsive sidebar toggle for mobile
- Breadcrumb navigation updates
- Page loading and routing
- Event listener management
- Responsive resize handling

### Mobile Menu Behavior
1. Hamburger button appears on screens ≤768px
2. Clicking toggles sidebar visibility
3. Clicking outside sidebar closes it
4. Navigating to a page closes sidebar
5. Window resize auto-closes sidebar on desktop view

## Page Structure

### Page Header
```html
<div class="page-header">
  <div>
    <h1>Page Title</h1>
    <p>Optional description</p>
  </div>
  <!-- Optional actions on the right -->
</div>
```

### Content Containers
- Use `.card` for sections
- Use `.grid` classes for multi-column layouts
- Use `.table-responsive` for tables
- Use `.grid-4`, `.grid-3`, `.grid-2` for different layouts

## Accessibility Features

- Semantic HTML structure
- ARIA labels where appropriate
- Keyboard navigation support
- Color contrast compliance
- Focus indicators on interactive elements

## Performance Optimizations

- CSS custom properties for theme consistency
- Minimal JavaScript dependencies
- Lazy loading for page modules
- Responsive images and assets
- Hardware-accelerated animations

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Best Practices

### When Building New Pages

1. **Use the correct grid class**:
   - `grid grid-4` for metric cards
   - `grid grid-2` for larger cards/sections
   - `grid` without modifier for flexible layout

2. **Structure pages consistently**:
   - Page header first
   - KPIs or metrics second
   - Main content (tables, forms) below

3. **Color code badges**:
   - Success (green) for positive metrics
   - Warning (amber) for caution
   - Danger (red) for issues
   - Info (blue) for neutral info

4. **Use semantic markup**:
   - `<strong>` for important values
   - `<span class="badge">` for status indicators
   - `<div class="alert">` for messages

### CSS Class Naming
- Use BEM-like naming: `.card-header`, `.btn-primary`
- Utility classes: `.mb-xl`, `.text-center`, `.flex`
- Responsive prefixes: none (base), `@media (max-width: 768px)` for mobile

## Customization

### Changing the Primary Color
Update the CSS variable in `css/main.css`:
```css
:root {
  --primary: #667eea;
  --primary-dark: #764ba2;
  --primary-light: #f0f4ff;
}
```

### Adjusting Spacing
Modify spacing variables:
```css
:root {
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  /* ... */
}
```

### Responsive Breakpoints
Current breakpoints:
- `@media (max-width: 1200px)` - Large tablets
- `@media (max-width: 768px)` - Tablets and small devices
- `@media (max-width: 480px)` - Small phones

## Dark Mode (Future Enhancement)

The design is prepared for dark mode implementation. Add this to `css/main.css`:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a2e;
    --bg-card: #16213e;
    --text: #edf2f4;
    /* ... */
  }
}
```

## Common Patterns

### Loading State
```html
<div class="loading">
  <div class="spinner"></div>
</div>
```

### Empty State
```html
<div class="empty-state">
  <div class="empty-state-icon">📭</div>
  <div class="empty-state-text">No data available</div>
  <div class="empty-state-subtext">Data will appear when available</div>
</div>
```

### Status Indicator
```html
<span class="badge badge-success">Active</span>
<span class="badge badge-warning">Pending</span>
<span class="badge badge-danger">Error</span>
```

### Alert Box
```html
<div class="alert alert-success">
  Operation completed successfully!
</div>
```

## Resources

- CSS Custom Properties: Used extensively for theme consistency
- Flexbox: Primary layout method
- CSS Grid: Used for page layouts
- Transitions: 150ms-500ms cubic-bezier timing
- Z-index Scale: 1000+ for overlays, 500+ for sticky, 100+ for absolute

---

**Last Updated**: May 2026
**Version**: 2.0 (Modern Responsive Redesign)
