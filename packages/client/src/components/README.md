# KFlow Component Library

A comprehensive component library built with atomic design principles, Tailwind CSS, and React Storybook.

## Overview

This component library provides a consistent design system for the KFlow application, organized using atomic design methodology:

- **Atoms**: Basic building blocks (Button, Input, Typography, etc.)
- **Molecules**: Composite components built from atoms (FormField, Card, Modal, etc.)
- **Organisms**: Complex components built from molecules (Header, ConceptCard, ProgressTracker, etc.)

## Structure

```
src/components/
├── atoms/          # Basic building blocks
│   ├── Button/
│   ├── Input/
│   ├── Typography/
│   └── ...
├── molecules/      # Composite components
├── organisms/       # Complex components
└── stories/         # Storybook stories
```

## Getting Started

### Installation

The component library uses Tailwind CSS for styling. Make sure Tailwind is configured in your project.

### Usage

```tsx
import { Button, Input, Typography } from '@/components/atoms';

function MyComponent() {
  return (
    <div>
      <Typography variant="h1">Welcome</Typography>
      <Input label="Email" placeholder="you@example.com" />
      <Button variant="primary">Submit</Button>
    </div>
  );
}
```

## Storybook

To view and test components in Storybook:

```bash
npm run storybook
```

Storybook will open at `http://localhost:6006`

## Phase 1 Status: ✅ Complete

### Completed Tasks

1. ✅ **Component Library Structure**
   - Created folder structure for atoms, molecules, and organisms
   - Set up index files for exports

2. ✅ **Tailwind Configuration**
   - Extended Tailwind config with design tokens
   - Added semantic colors (success, warning, error, info)
   - Added purple color scale
   - Configured typography scale
   - Added border radius, shadows, and transition utilities

3. ✅ **Base Atoms**
   - **Button**: Full-featured button with variants, sizes, icons, and loading states
   - **Input**: Input component with labels, errors, icons, and helper text
   - **Typography**: Comprehensive typography system with headings, body text, and special variants

4. ✅ **React Storybook Setup**
   - Configured Storybook with Tailwind CSS support
   - Set up dark mode theme toggle
   - Created stories for all base atoms
   - Configured accessibility addon

### Next Steps (Phase 2)

1. Install Storybook dependencies:
   ```bash
   npm install
   ```

2. Complete remaining atoms:
   - Textarea
   - Checkbox
   - Radio
   - Badge
   - Icon
   - Avatar
   - Spinner
   - ProgressBar
   - Divider

3. Enhance theme system utilities

## Components

### Atoms

#### Button
A versatile button component with multiple variants, sizes, and states.

**Variants**: primary, secondary, success, danger, warning, ghost, link  
**Sizes**: xs, sm, md, lg, xl  
**Features**: Icons, loading states, full width option

#### Input
A versatile input component with support for labels, errors, icons, and helper text.

**Types**: text, email, password, number, search, url, tel  
**Features**: Labels, helper text, error messages, icons, clearable

#### Typography
Typography components for consistent text styling.

**Variants**: h1-h6, body, small, large, code, blockquote  
**Colors**: default, primary, secondary, success, warning, error, muted  
**Weights**: light, normal, medium, semibold, bold

## Design Tokens

### Colors

- **Primary**: Indigo (indigo-600 light, indigo-500 dark)
- **Secondary**: Purple (purple-500 to purple-600)
- **Success**: Green (green-500 to green-600)
- **Warning**: Yellow (yellow-500 to yellow-600)
- **Error**: Red (red-500 to red-600)
- **Info**: Blue (blue-500 to blue-600)

### Typography

- **Font Family**: System font stack
- **Sizes**: xs (12px), sm (14px), base (16px), lg (18px), xl (20px), 2xl (24px), 3xl (30px), 4xl (36px)
- **Weights**: 300, 400, 500, 600, 700

### Spacing

Uses Tailwind's default spacing scale (0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64)

### Border Radius

- sm: 4px
- md: 8px
- lg: 12px
- xl: 16px
- 2xl: 24px

## Theme Support

All components support both light and dark themes using Tailwind's `dark:` prefix. The theme is controlled via the `dark` class on the document root element.

## Accessibility

All components are built with accessibility in mind:
- Proper ARIA attributes
- Keyboard navigation support
- Focus indicators
- Screen reader compatibility
- WCAG 2.1 AA color contrast compliance

## Contributing

When adding new components:

1. Follow atomic design principles
2. Use Tailwind CSS for styling
3. Support both light and dark themes
4. Include proper TypeScript types
5. Add Storybook stories
6. Ensure accessibility compliance
7. Write tests

## Documentation

For detailed component documentation, see:
- Component stories in Storybook
- `docs/KFLOW_V2_COMPONENT_LIBRARY.md` for the full implementation plan


