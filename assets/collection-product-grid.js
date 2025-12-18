/**
 * Equalizes image heights in product grid rows
 * Groups products by row and applies the tallest image's aspect ratio to all images in that row
 */
class CollectionProductGrid {
  static instance = null;

  constructor() {
    if (CollectionProductGrid.instance) {
      CollectionProductGrid.instance.destroy();
    }
    CollectionProductGrid.instance = this;

    this.productGrid = null;
    this.resizeObserver = null;
    this.resizeTimeout = null;
    this.imageLoadPromises = [];
    this.resizeHandler = null;
  }

  init() {
    this.productGrid = document.getElementById("product-grid");
    if (!this.productGrid) return;

    // Wait for images to load and animations to complete in parallel
    Promise.all([this.waitForImages(), this.waitForAnimations()]).then(() => {
      // Use multiple requestAnimationFrame calls to ensure layout is fully settled
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.equalizeRowHeights();

          // Retry after a short delay to catch any late layout changes
          setTimeout(() => {
            requestAnimationFrame(() => {
              this.equalizeRowHeights();
            });
          }, 300);
        });
      });
    });

    // Handle window resize with debouncing
    this.resizeHandler = () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.equalizeRowHeights();
      }, 250);
    };
    window.addEventListener("resize", this.resizeHandler);

    // Use ResizeObserver to detect layout changes
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          this.equalizeRowHeights();
        }, 250);
      });
      this.resizeObserver.observe(this.productGrid);
    }
  }

  waitForAnimations() {
    return new Promise((resolve) => {
      // Use multiple requestAnimationFrame calls to ensure layout is fully settled
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Additional delay to account for CSS animations/transitions
          setTimeout(() => {
            // One more requestAnimationFrame to ensure everything is painted
            requestAnimationFrame(() => {
              resolve();
            });
          }, 200); // Wait for slide-in animations to complete
        });
      });
    });
  }

  waitForImages() {
    const images = this.productGrid.querySelectorAll(".card__media img");
    this.imageLoadPromises = Array.from(images).map((img) => {
      if (img.complete) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    });
    return Promise.all(this.imageLoadPromises);
  }

  equalizeRowHeights() {
    if (!this.productGrid) return;

    // Get all grid items (li elements)
    const gridItems = Array.from(
      this.productGrid.querySelectorAll("li.grid__item")
    );
    if (gridItems.length === 0) return;

    // Group items by row based on their top position
    const rows = this.groupItemsByRow(gridItems);

    // Process each row
    rows.forEach((row) => {
      this.processRow(row);
    });
  }

  groupItemsByRow(gridItems) {
    const rows = [];
    const rowMap = new Map();
    const tolerance = 5; // Pixels tolerance for grouping items in the same row

    gridItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const top = Math.round(rect.top / tolerance) * tolerance; // Round to nearest tolerance value

      if (!rowMap.has(top)) {
        rowMap.set(top, []);
      }
      rowMap.get(top).push(item);
    });

    // Convert map to array and sort by top position
    rowMap.forEach((items) => {
      rows.push(items);
    });

    return rows.sort((a, b) => {
      const topA = a[0].getBoundingClientRect().top;
      const topB = b[0].getBoundingClientRect().top;
      return topA - topB;
    });
  }

  processRow(rowItems) {
    if (rowItems.length === 0) return;

    let maxAspectRatio = null;
    const cardElements = [];
    const cardInnerElements = [];

    // Find the tallest image in this row and calculate its aspect ratio
    rowItems.forEach((item) => {
      const card = item.querySelector(".card");
      const cardInner = item.querySelector(".card__inner");
      const cardMedia = item.querySelector(".card__media");

      if (!card || !cardInner || !cardMedia) return;

      cardElements.push(card);
      cardInnerElements.push(cardInner);

      // Get the image inside card__media
      const img = cardMedia.querySelector("img");
      if (!img) return;

      // Get natural dimensions for accurate aspect ratio calculation
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      // Get current rendered width
      const currentWidth = cardMedia.offsetWidth || item.offsetWidth;

      // Calculate aspect ratio from natural dimensions if available
      if (naturalWidth > 0 && naturalHeight > 0) {
        const aspectRatio = naturalWidth / naturalHeight;

        // Calculate what the height would be at current width with this aspect ratio
        const calculatedHeight = currentWidth / aspectRatio;

        // Track the tallest aspect ratio (which will result in tallest height)
        if (
          !maxAspectRatio ||
          calculatedHeight > currentWidth / maxAspectRatio
        ) {
          maxAspectRatio = aspectRatio;
        }
      } else if (currentWidth > 0) {
        // Fallback: use current dimensions if natural dimensions not available
        const currentHeight = cardMedia.offsetHeight;
        if (currentHeight > 0) {
          const aspectRatio = currentWidth / currentHeight;
          if (
            !maxAspectRatio ||
            currentHeight > currentWidth / maxAspectRatio
          ) {
            maxAspectRatio = aspectRatio;
          }
        }
      }
    });

    // If we found a valid aspect ratio, apply it to all cards in the row
    if (maxAspectRatio && cardElements.length > 0) {
      // Calculate ratio-percent: (1 / aspectRatio) * 100
      const ratioPercent = (1 / maxAspectRatio) * 100;

      // Replace the existing --ratio-percent value on .card and .card__inner
      cardElements.forEach((card) => {
        card.style.setProperty("--ratio-percent", `${ratioPercent}%`);
      });

      cardInnerElements.forEach((cardInner) => {
        cardInner.style.setProperty("--ratio-percent", `${ratioPercent}%`);
      });
    }
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    clearTimeout(this.resizeTimeout);
    this.productGrid = null;
  }
}

// Initialize function
function initCollectionProductGrid() {
  if (document.getElementById("product-grid")) {
    const grid = new CollectionProductGrid();
    grid.init();
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCollectionProductGrid);
} else {
  initCollectionProductGrid();
}

// Re-initialize when new content is loaded (e.g., via AJAX)
document.addEventListener("shopify:section:load", (event) => {
  if (event.detail.sectionId && document.getElementById("product-grid")) {
    setTimeout(initCollectionProductGrid, 100);
  }
});

// Handle AJAX updates from facets/filters
// Hook into FacetFiltersForm if it exists
if (
  typeof FacetFiltersForm !== "undefined" &&
  FacetFiltersForm.renderProductGridContainer
) {
  const originalRenderProductGridContainer =
    FacetFiltersForm.renderProductGridContainer;
  FacetFiltersForm.renderProductGridContainer = function (html) {
    originalRenderProductGridContainer.call(this, html);
    // Re-initialize after grid is updated
    setTimeout(initCollectionProductGrid, 300);
  };
}

// Use MutationObserver to detect when product-grid content changes
if (typeof MutationObserver !== "undefined") {
  let productGridObserver = null;

  const observeGrid = () => {
    const grid = document.getElementById("product-grid");
    if (grid && !productGridObserver) {
      productGridObserver = new MutationObserver((mutations) => {
        let shouldReinit = false;
        mutations.forEach((mutation) => {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            shouldReinit = true;
          }
        });
        if (shouldReinit) {
          setTimeout(initCollectionProductGrid, 300);
        }
      });

      productGridObserver.observe(grid, {
        childList: true,
        subtree: true,
      });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeGrid);
  } else {
    observeGrid();
  }
}
