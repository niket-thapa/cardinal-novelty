class InfiniteScroll {
  constructor() {
    this.productGrid = document.getElementById("product-grid");
    this.loader = document.getElementById("infinite-scroll-loader");
    this.currentPage = 1;
    this.loading = false;
    this.hasMorePages = true;
    this.sectionId = this.productGrid?.dataset.id;
    this.productsPerPage = 16; // Default, will be updated from section settings
    
    if (!this.productGrid || !this.sectionId) return;
    
    this.init();
  }

  init() {
    // Get products per page from section settings if available
    const sectionElement = document.querySelector(`[data-section-id="${this.sectionId}"]`);
    if (sectionElement) {
      // Try to get from a data attribute if set, otherwise use default
      const perPage = sectionElement.dataset.productsPerPage;
      if (perPage) {
        this.productsPerPage = parseInt(perPage, 10);
      }
    }

    // Set up intersection observer for infinite scroll
    this.setupIntersectionObserver();
    
    // Listen for filter changes to reset pagination
    this.setupFilterListener();
  }

  setupIntersectionObserver() {
    const options = {
      root: null,
      rootMargin: "200px", // Start loading before reaching the bottom
      threshold: 0.1,
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !this.loading && this.hasMorePages) {
          this.loadMoreProducts();
        }
      });
    }, options);

    if (this.loader) {
      this.observer.observe(this.loader);
    }
  }

  setupFilterListener() {
    // Reset pagination when filters change
    if (typeof FacetFiltersForm !== "undefined") {
      const originalRenderProductGridContainer = FacetFiltersForm.renderProductGridContainer;
      const self = this;
      
      FacetFiltersForm.renderProductGridContainer = function (html) {
        originalRenderProductGridContainer.call(this, html);
        // Reset infinite scroll state
        self.currentPage = 1;
        self.hasMorePages = true;
        self.loading = false;
        // Re-observe the loader if it exists
        if (self.loader && self.observer) {
          self.observer.observe(self.loader);
        }
      };
    }
  }

  async loadMoreProducts() {
    if (this.loading || !this.hasMorePages) return;

    this.loading = true;
    this.currentPage++;

    if (this.loader) {
      this.loader.style.display = "block";
    }

    try {
      // Build URL with current filters/sort and next page
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set("page", this.currentPage);
      urlParams.set("section_id", this.sectionId);

      const url = `${window.location.pathname}?${urlParams.toString()}`;

      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const newContainer = doc.getElementById("ProductGridContainer");
      
      if (!newContainer) {
        this.hasMorePages = false;
        if (this.loader) {
          this.loader.style.display = "none";
        }
        return;
      }

      const newProductGrid = newContainer.querySelector("#product-grid");
      if (!newProductGrid) {
        this.hasMorePages = false;
        if (this.loader) {
          this.loader.style.display = "none";
        }
        return;
      }

      const newProducts = Array.from(newProductGrid.querySelectorAll("li.grid__item"));
      
      if (newProducts.length === 0) {
        this.hasMorePages = false;
        if (this.loader) {
          this.loader.style.display = "none";
        }
        return;
      }

      // Append new products to the grid (before the loader)
      newProducts.forEach((product) => {
        // Remove scroll-trigger classes and reset animation order for smooth insertion
        product.classList.remove("scroll-trigger--offscreen");
        product.classList.remove("animate--slide-in");
        
        // Calculate new animation order based on current grid items (excluding loader)
        const currentItems = this.productGrid.querySelectorAll("li.grid__item:not(#infinite-scroll-loader)");
        const animationOrder = currentItems.length + 1;
        product.style.setProperty("--animation-order", animationOrder);
        
        // Insert before the loader
        if (this.loader) {
          this.productGrid.insertBefore(product, this.loader);
        } else {
          this.productGrid.appendChild(product);
        }
      });

      // Initialize any new scripts/elements
      if (typeof initializeScrollAnimationTrigger === "function") {
        initializeScrollAnimationTrigger(this.productGrid.innerHTML);
      }

      // Re-initialize collection product grid for height equalization
      if (typeof initCollectionProductGrid === "function") {
        setTimeout(() => {
          initCollectionProductGrid();
        }, 300);
      }

      // Check if there are more pages - if we got fewer products than requested, we're done
      // Also check if there's pagination info indicating more pages exist
      const paginationInfo = newContainer.querySelector(".pagination");
      if (newProducts.length < this.productsPerPage) {
        this.hasMorePages = false;
      } else if (paginationInfo) {
        // Check if there's a next page link
        const nextPageLink = paginationInfo.querySelector('a[aria-label*="Next"], .pagination__item--next:not(.disabled)');
        if (!nextPageLink) {
          this.hasMorePages = false;
        }
      }

    } catch (error) {
      console.error("Error loading more products:", error);
      this.hasMorePages = false;
    } finally {
      this.loading = false;
      if (this.loader) {
        this.loader.style.display = "none";
      }
    }
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Initialize infinite scroll
function initInfiniteScroll() {
  const productGrid = document.getElementById("product-grid");
  if (productGrid && !window.infiniteScrollInstance) {
    window.infiniteScrollInstance = new InfiniteScroll();
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initInfiniteScroll);
} else {
  initInfiniteScroll();
}

// Re-initialize when section loads
document.addEventListener("shopify:section:load", (event) => {
  if (event.detail.sectionId && document.getElementById("product-grid")) {
    if (window.infiniteScrollInstance) {
      window.infiniteScrollInstance.destroy();
      delete window.infiniteScrollInstance;
    }
    setTimeout(initInfiniteScroll, 100);
  }
});

