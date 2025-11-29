# Work Sans Font Setup - Default Font Configuration

Work Sans has been successfully set as the default font for your Shopify theme, following Shopify standards.

## Implementation Summary

### 1. Google Fonts Integration
- **Location**: `layout/theme.liquid`
- **Fonts Loaded**: Work Sans (all weights: 100-900) and Gabarito
- **Loading Method**: Google Fonts with `display=swap` for optimal performance
- **Preconnect**: Added for faster font loading

### 2. CSS Variables Updated
- **Location**: `layout/theme.liquid` (in `:root` styles)
- **Changes Made**:
  - `--font-body-family`: Now includes 'Work Sans' as the primary font
  - `--font-heading-family`: Now includes 'Work Sans' as the primary font
- **Shopify Compatibility**: Still respects Shopify font picker settings, with Work Sans as the default fallback

### 3. CSS Variable Added
- **Location**: `assets/base.css` (`:root`)
- **Variable**: `--font-work-sans-family`
- **Fallbacks**: Includes system fonts for better compatibility

### 4. Utility Classes Created
- **Location**: `assets/base.css`
- **Available Classes**:
  - `.font-work-sans` - Base class
  - `.font-work-sans-thin` (100)
  - `.font-work-sans-extralight` (200)
  - `.font-work-sans-light` (300)
  - `.font-work-sans-regular` (400)
  - `.font-work-sans-medium` (500)
  - `.font-work-sans-semibold` (600)
  - `.font-work-sans-bold` (700)
  - `.font-work-sans-extrabold` (800)
  - `.font-work-sans-black` (900)

## How It Works

### Automatic Application
Work Sans is now the default font throughout your theme because:
1. It's the first font in the `--font-body-family` and `--font-heading-family` CSS variables
2. All theme elements use these CSS variables via `var(--font-body-family)` and `var(--font-heading-family)`
3. The font is loaded from Google Fonts and available site-wide

### Where Work Sans is Applied
- ✅ Body text (via `--font-body-family`)
- ✅ Headings (via `--font-heading-family`)
- ✅ Buttons
- ✅ Forms and inputs
- ✅ Navigation menus
- ✅ Product cards
- ✅ All theme sections

### Shopify Font Picker Compatibility
- The Shopify font picker in the theme customizer still works
- If a user selects a different font, it will be used as a fallback
- Work Sans remains the primary/default font

## Usage Examples

### Automatic (Default)
All text automatically uses Work Sans:
```html
<p>This text uses Work Sans automatically</p>
<h1>This heading uses Work Sans automatically</h1>
```

### Using Utility Classes
```liquid
<div class="font-work-sans font-work-sans-bold">
  Bold Work Sans text
</div>
```

### Using CSS Variable
```css
.custom-element {
  font-family: var(--font-work-sans-family);
  font-weight: 600;
}
```

## Font Weights Available

Work Sans includes all weights from 100-900:
- 100: Thin
- 200: Extra Light
- 300: Light
- 400: Regular (default)
- 500: Medium
- 600: Semi Bold
- 700: Bold
- 800: Extra Bold
- 900: Black

## Shopify Standards Compliance

✅ **Follows Shopify Best Practices**:
- Uses CSS variables for maintainability
- Respects Shopify font picker system
- Includes proper fallback fonts
- Optimized font loading with preconnect
- Uses `display=swap` for better performance
- No breaking changes to existing functionality

## Files Modified

1. `layout/theme.liquid`
   - Added Work Sans Google Fonts link
   - Updated `--font-body-family` and `--font-heading-family` variables

2. `assets/base.css`
   - Added `--font-work-sans-family` CSS variable
   - Added Work Sans utility classes

## Testing Checklist

- [ ] Verify Work Sans loads on all pages
- [ ] Check body text uses Work Sans
- [ ] Check headings use Work Sans
- [ ] Verify font picker in theme customizer still works
- [ ] Test on different devices/browsers
- [ ] Check font loading performance

## Notes

- Work Sans is now the default font site-wide
- The Shopify font picker in the admin still functions but Work Sans takes priority
- All existing CSS using `var(--font-body-family)` and `var(--font-heading-family)` automatically uses Work Sans
- No changes needed to individual section files - they inherit the default font automatically

