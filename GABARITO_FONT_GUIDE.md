# Gabarito Font Setup Guide

The Gabarito Google Font has been successfully added to your Shopify theme with easy-to-use CSS variables and utility classes.

## CSS Variable

The font is available via the CSS variable:
```css
--font-gabarito-family: 'Gabarito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

## Usage Examples

### 1. Using CSS Variable (Recommended)
```css
.my-element {
  font-family: var(--font-gabarito-family);
  font-weight: 600; /* or 400, 500, 600, 700, 800, 900 */
}
```

### 2. Using Utility Classes in HTML/Liquid
```liquid
<h1 class="font-gabarito font-gabarito-bold">Bold Heading</h1>
<p class="font-gabarito font-gabarito-regular">Regular text</p>
<span class="font-gabarito font-gabarito-semibold">Semibold text</span>
```

### 3. Available Utility Classes

- `.font-gabarito` - Base class (uses default weight)
- `.font-gabarito-regular` - Weight: 400
- `.font-gabarito-medium` - Weight: 500
- `.font-gabarito-semibold` - Weight: 600
- `.font-gabarito-bold` - Weight: 700
- `.font-gabarito-extrabold` - Weight: 800
- `.font-gabarito-black` - Weight: 900

### 4. Using in Liquid Templates
```liquid
<div class="font-gabarito font-gabarito-bold">
  {{ product.title }}
</div>

<style>
  .custom-heading {
    font-family: var(--font-gabarito-family);
    font-weight: 700;
  }
</style>
```

### 5. Using in Section Settings (CSS)
You can also use it in custom CSS within Shopify theme customizer:
```css
.my-custom-class {
  font-family: var(--font-gabarito-family);
}
```

## Font Weights Available

The Gabarito font includes the following weights:
- 400 (Regular)
- 500 (Medium)
- 600 (Semibold)
- 700 (Bold)
- 800 (Extrabold)
- 900 (Black)

## Implementation Details

- **Font Loading**: The font is loaded via Google Fonts with `display=swap` for better performance
- **Preconnect**: Added preconnect links for faster font loading
- **Fallback**: Includes system font fallbacks for better compatibility
- **Location**: 
  - Font link added in `layout/theme.liquid`
  - CSS variable defined in `layout/theme.liquid` (in `:root`)
  - Utility classes added in `assets/base.css`

## Best Practices

1. **Performance**: The font is loaded asynchronously, so it won't block page rendering
2. **Fallbacks**: System fonts are included as fallbacks if the font fails to load
3. **Weight Selection**: Use appropriate font weights for better readability
4. **Consistency**: Use the CSS variable for consistent font application across the theme

