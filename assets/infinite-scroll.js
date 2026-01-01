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
      
      // Check if there are more pages from hidden data element
      const paginationData = sectionElement.querySelector('[data-has-next-page]');
      if (paginationData) {
        const hasNextPage = paginationData.dataset.hasNextPage === "true";
        if (!hasNextPage) {
          this.hasMorePages = false;
        }
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

    if (this.loader && this.hasMorePages) {
      // Show loader if there are more pages to load
      this.loader.style.display = "block";
      this.observer.observe(this.loader);
    } else if (this.loader) {
      // Hide loader if no more pages
      this.loader.style.display = "none";
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
      
      // Find the section element first to get pagination data
      const sectionElement = doc.querySelector(`[data-section-id="${this.sectionId}"]`);
      if (!sectionElement) {
        this.hasMorePages = false;
        if (this.loader) {
          this.loader.style.display = "none";
        }
        return;
      }
      
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

      // Get products, excluding the loader element
      const allItems = Array.from(newProductGrid.querySelectorAll("li.grid__item"));
      const newProducts = allItems.filter(item => item.id !== "infinite-scroll-loader");
      
      if (newProducts.length === 0) {
        this.hasMorePages = false;
        if (this.loader) {
          this.loader.style.display = "none";
        }
        return;
      }

      // Check if there are more pages BEFORE appending products
      // This is the most reliable way to check - use the section element we found earlier
      let hasMorePages = false;
      
      // Find pagination data in the section element
      const paginationData = sectionElement.querySelector('[data-has-next-page]');
      if (paginationData) {
        hasMorePages = paginationData.dataset.hasNextPage === "true";
        const currentPage = parseInt(paginationData.dataset.currentPage) || 0;
        const totalPages = parseInt(paginationData.dataset.totalPages) || 0;
        console.log(`Infinite scroll: Loaded page ${currentPage} of ${totalPages}, hasNext: ${hasMorePages}, visible products: ${newProducts.length}`);
      } else {
        // Fallback: check pagination info if it exists
        const paginationInfo = newContainer.querySelector(".pagination");
        if (paginationInfo) {
          const nextPageLink = paginationInfo.querySelector('a[aria-label*="Next"], .pagination__item--next:not(.disabled)');
          hasMorePages = !!nextPageLink;
          console.log(`Infinite scroll: Using pagination UI fallback, hasNext: ${hasMorePages}`);
        } else {
          // Last fallback: check if current page is less than total pages
          // This is more reliable than product count when products are filtered
          const currentPageData = sectionElement.querySelector('[data-current-page]');
          const totalPagesData = sectionElement.querySelector('[data-total-pages]');
          if (currentPageData && totalPagesData) {
            const currentPage = parseInt(currentPageData.dataset.currentPage) || 0;
            const totalPages = parseInt(totalPagesData.dataset.totalPages) || 0;
            hasMorePages = currentPage < totalPages;
            console.log(`Infinite scroll: Using page count fallback, page ${currentPage} of ${totalPages}, hasNext: ${hasMorePages}`);
          } else {
            // Very last fallback: if we got products, assume there might be more (unless we got 0)
            hasMorePages = newProducts.length > 0;
            console.log(`Infinite scroll: No pagination data found, assuming hasMorePages: ${hasMorePages} (got ${newProducts.length} products)`);
          }
        }
      }
      
      // IMPORTANT: Update hasMorePages based on pagination data ONLY
      // Do NOT use product count because products can be filtered/hidden
      this.hasMorePages = hasMorePages;

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
      // Note: initializeScrollAnimationTrigger expects a DOM element, not HTML string
      if (typeof initializeScrollAnimationTrigger === "function") {
        // Pass the product grid element to initialize animations for newly added products
        initializeScrollAnimationTrigger(this.productGrid);
      }

      // Re-initialize collection product grid for height equalization
      if (typeof initCollectionProductGrid === "function") {
        setTimeout(() => {
          initCollectionProductGrid();
        }, 300);
      }

      // Don't update product count during infinite scroll - it's already set on initial load
      // The count is calculated from the first page ratio and total collection count

    } catch (error) {
      console.error("Error loading more products:", error);
      this.hasMorePages = false;
    } finally {
      this.loading = false;
      if (this.loader) {
        if (this.hasMorePages) {
          // Show loader and re-observe if there are more pages
          this.loader.style.display = "block";
          
          // Disconnect and reconnect observer to ensure it's properly set up
          if (this.observer) {
            this.observer.disconnect();
            // Use multiple requestAnimationFrame calls to ensure DOM is fully updated
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (this.loader && this.hasMorePages && this.observer) {
                  this.observer.observe(this.loader);
                  console.log(`Infinite scroll: Observer re-attached for page ${this.currentPage + 1}, loader visible: ${this.loader.offsetParent !== null}`);
                  
                  // If loader is already in viewport, trigger load immediately
                  const rect = this.loader.getBoundingClientRect();
                  const isInViewport = rect.top < window.innerHeight + 200; // 200px is rootMargin
                  if (isInViewport && !this.loading) {
                    console.log("Infinite scroll: Loader already in viewport, loading next page immediately");
                    setTimeout(() => {
                      if (!this.loading && this.hasMorePages) {
                        this.loadMoreProducts();
                      }
                    }, 100);
                  }
                }
              });
            });
          }
        } else {
          // Hide loader if no more pages
          this.loader.style.display = "none";
          if (this.observer) {
            this.observer.disconnect();
          }
          console.log("Infinite scroll: No more pages to load");
          
          // Note: Product count is now handled by Liquid, not JavaScript
          // The count is calculated server-side and displayed immediately
        }
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

