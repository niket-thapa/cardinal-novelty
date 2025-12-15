if (!customElements.get("toy-capsule-api")) {
  customElements.define(
    "toy-capsule-api",
    class ToyCapsuleApi extends HTMLElement {
      constructor() {
        super();
        this.productId = window.toyCapsuleData?.productId;
      }

      connectedCallback() {
        // Show loading state immediately when connected to DOM
        this.showLoading();

        // Start fetching product data
        this.loadProduct();
      }

      showLoading() {
        // Show loading spinner immediately
        this.innerHTML = `
          <div class="toy-capsule-item-container">
            <div class="toy-capsule-loading">
              <div class="toy-capsule-loading-spinner">
                <svg class="spinner" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
                  <circle class="path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle>
                </svg>
              </div>
            </div>
          </div>
        `;
      }

      async loadProduct() {
        if (!this.productId) {
          this.showError("Toy capsule product ID not found.");
          return;
        }

        try {
          const product = await this.fetchProduct(this.productId);
          if (product) {
            this.renderProduct(product);
          } else {
            this.showError("Toy capsule product not found.");
          }
        } catch (error) {
          console.error("Error loading toy capsule:", error);
          this.showError("Error loading toy capsule. Please try again later.");
        }
      }

      async fetchProduct(productId) {
        const response = await fetch(`/products.json?ids=${productId}`);
        const data = await response.json();

        if (data.products && data.products.length > 0) {
          // Find the product with matching ID (not always at index 0)
          const product = data.products.find(
            (p) => p.id.toString() === productId.toString()
          );
          return product || null;
        }
        return null;
      }

      renderProduct(product) {
        const variant =
          product.variants && product.variants.length > 0
            ? product.variants[0]
            : null;

        if (!variant) {
          this.showError("Product variant not found.");
          return;
        }

        // Get featured image from images array
        let featuredImage = null;
        if (product.images && product.images.length > 0) {
          featuredImage = product.images[0].src || product.images[0];
        } else if (product.featured_image) {
          featuredImage = product.featured_image;
        }

        // Format price
        const price = (variant.price / 100).toFixed(2);
        const formattedPrice = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(price);

        // Get product URL
        const productUrl = `/products/${product.handle}`;

        let html = "";

        // Product Image
        if (featuredImage) {
          const imageSrc =
            typeof featuredImage === "string"
              ? featuredImage
              : featuredImage.src || featuredImage;

          html += `
            <a href="${productUrl}" class="toy-capsule-item">
              <div class="toy-capsule-image-wrapper">
                <img 
                  class="toy-capsule-image" 
                  src="${imageSrc}" 
                  alt="${this.escapeHtml(product.title)}"
                  width="100"
                  height="100"
                  loading="lazy"
                />
              </div>
              <div class="toy-capsule-info">
                <div class="toy-capsule-title">${this.escapeHtml(
                  product.title
                )}</div>
                <div class="toy-capsule-price">${formattedPrice}</div>
              </div>
            </a>
          `;
        } else {
          html += `
            <a href="${productUrl}" class="toy-capsule-item">
              <div class="toy-capsule-image-wrapper">
                <img 
                  class="toy-capsule-image" 
                  src="" 
                  alt="${this.escapeHtml(product.title)}"
                  width="100"
                  height="100"
                  loading="lazy"
                />
              </div>
              <div class="toy-capsule-info">
                <div class="toy-capsule-title">${this.escapeHtml(
                  product.title
                )}</div>
                <div class="toy-capsule-price">${formattedPrice}</div>
              </div>
            </a>
          `;
        }

        this.innerHTML = `
          <div class="toy-capsule-item-container">
            ${html}
          </div>
        `;
      }

      showError(message) {
        this.innerHTML = `
          <div class="toy-capsule-error">
            <p>${this.escapeHtml(message)}</p>
          </div>
        `;
      }

      escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
      }
    }
  );
}

// Initialize toy capsule when DOM is ready
(function () {
  function initToyCapsules() {
    const toyCapsuleBlocks = document.querySelectorAll(".toy-capsule-block");
    toyCapsuleBlocks.forEach((block) => {
      const container = block.querySelector(".toy-capsule-item-container");
      if (container && !block.querySelector("toy-capsule-api")) {
        // Create the custom element - constructor will set loading spinner immediately
        const apiElement = document.createElement("toy-capsule-api");

        // Replace the container - spinner will be visible immediately
        container.replaceWith(apiElement);
      }
    });
  }

  // Wait for DOM to be ready, but initialize as soon as possible
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initToyCapsules);
  } else {
    // DOM already ready, but wait a tiny bit to ensure styles are loaded
    setTimeout(initToyCapsules, 0);
  }
})();
