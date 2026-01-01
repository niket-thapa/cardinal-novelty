/**
 * Counts all available products across all pages in the collection
 * Optimized for speed
 */
class ProductCount {
  constructor() {
    this.sectionId = null;
    this.productsPerPage = 16;
    this.totalAvailableCount = 0;
    this.isCounting = false;
    this.isSearchPage = false;
    this.init();
  }

  init() {
    const sectionElement = document.querySelector("[data-section-id]");
    if (!sectionElement) return;

    this.sectionId = sectionElement.dataset.sectionId;
    const perPage = sectionElement.dataset.productsPerPage;
    if (perPage) {
      this.productsPerPage = parseInt(perPage, 10);
    }

    // Find the product-count-data section ID
    // This section is added to the collection template for fast counting
    const countDataSection = document.querySelector(
      '[data-section-type="product-count-data"]'
    );
    this.countDataSectionId = countDataSection
      ? countDataSection.dataset.sectionId
      : null;

    this.isSearchPage =
      window.location.pathname.includes("/search") ||
      new URLSearchParams(window.location.search).has("q");

    requestAnimationFrame(() => {
      this.showCounting();
    });

    this.countAllAvailableProducts();
  }

  showCounting() {
    const containers = document.querySelectorAll(
      "#ProductCount, #ProductCountDesktop"
    );
    containers.forEach((container) => {
      container.textContent = "Counting...";
      container.style.cssText =
        "opacity:1;visibility:visible;transition:opacity 0.3s ease-in-out";
    });
  }

  async countAllAvailableProducts() {
    if (this.isCounting) return;
    this.isCounting = true;
    this.totalAvailableCount = 0;

    try {
      // Get first page to determine total pages
      const firstPageData = await this.fetchPage(1);
      if (!firstPageData) {
        this.countVisibleProducts();
        return;
      }

      const { totalPages, count } = firstPageData;
      this.totalAvailableCount = count;

      if (totalPages <= 1) {
        this.updateCountDisplay(this.totalAvailableCount);
        this.isCounting = false;
        return;
      }

      // Fetch ALL remaining pages in parallel (no batching)
      const pagePromises = [];
      for (let page = 2; page <= totalPages; page++) {
        pagePromises.push(this.fetchPage(page));
      }

      const results = await Promise.all(pagePromises);
      results.forEach((result) => {
        if (result) this.totalAvailableCount += result.count;
      });

      this.updateCountDisplay(this.totalAvailableCount);
    } catch (error) {
      console.error("Error counting products:", error);
      this.countVisibleProducts();
    } finally {
      this.isCounting = false;
    }
  }

  async fetchPage(pageNumber) {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set("page", pageNumber);

      // Use product-count-data section if available, otherwise fall back to main section
      const sectionId = this.countDataSectionId || this.sectionId;
      urlParams.set("section_id", sectionId);

      const url = `${window.location.pathname}?${urlParams.toString()}`;

      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
        // Add cache hint
        cache: "force-cache",
      });

      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // If using product-count-data section, get count directly from data attributes
      if (this.countDataSectionId) {
        const countDataElement = doc.querySelector(
          `[data-section-id="${this.countDataSectionId}"]`
        );
        if (countDataElement) {
          const count = parseInt(
            countDataElement.dataset.productCount || "0",
            10
          );
          const totalPages = parseInt(
            countDataElement.dataset.totalPages || "1",
            10
          );
          return { count, totalPages };
        }
      }

      // Fallback: parse product grid (original method)
      const productGrid = doc.getElementById("product-grid");
      if (!productGrid) {
        return null;
      }

      // Count products by looking for product card wrappers (more accurate)
      const products = productGrid.querySelectorAll(
        "li.grid__item .product-card-wrapper"
      );
      const productCount = products.length;

      // Get total pages from pagination data
      const sectionElement = doc.querySelector(
        `[data-section-id="${this.sectionId}"]`
      );
      const paginationData = sectionElement
        ? sectionElement.querySelector("[data-total-pages]")
        : null;
      const totalPages = paginationData
        ? parseInt(paginationData.dataset.totalPages) || 1
        : 1;

      return { count: productCount, totalPages };
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error(`Error fetching page ${pageNumber}:`, error);
      }
      return null;
    }
  }

  countVisibleProducts() {
    const productGrid = document.getElementById("product-grid");
    if (!productGrid) return;

    const count = productGrid.querySelectorAll(
      "li.grid__item .product-card-wrapper"
    ).length;
    this.updateCountDisplay(count);
  }

  updateCountDisplay(count) {
    const containers = document.querySelectorAll(
      "#ProductCount, #ProductCountDesktop"
    );
    if (!containers.length) return;

    let newText;
    if (this.isSearchPage) {
      const searchTerm =
        new URLSearchParams(window.location.search).get("q") || "";
      newText = searchTerm
        ? `${count} ${count === 1 ? "result" : "results"} for "${searchTerm}"`
        : `${count} ${count === 1 ? "result" : "results"}`;
    } else {
      newText = `${count} ${count === 1 ? "product" : "products"}`;
    }

    containers.forEach((container) => {
      container.textContent = newText;
      container.style.opacity = "1";
    });
  }
}

// Initialize
function initProductCount() {
  if (document.getElementById("product-grid") && !window.productCountInstance) {
    window.productCountInstance = new ProductCount();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProductCount);
} else {
  initProductCount();
}

document.addEventListener("shopify:section:load", (event) => {
  if (event.detail.sectionId && document.getElementById("product-grid")) {
    window.productCountInstance = null;
    setTimeout(initProductCount, 100);
  }
});
