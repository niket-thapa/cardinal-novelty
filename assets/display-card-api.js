if (!customElements.get("display-card-api")) {
  customElements.define(
    "display-card-api",
    class DisplayCardApi extends HTMLElement {
      constructor() {
        super();
        this.productId = window.displayCardData?.productId;
        this.sectionId = window.displayCardData?.sectionId;
        this.blockId = window.displayCardData?.blockId;
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
          <div class="display-card-container">
            <div class="display-card-loading">
              <div class="display-card-loading-spinner">
                <svg class="spinner" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
                  <circle class="path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle>
                </svg>
              </div>
            </div>
            <div class="display_loading_text">Loading display card</div>
          </div>
        `;
      }

      async loadProduct() {
        if (!this.productId) {
          this.showError("Display card product ID not found.");
          return;
        }

        try {
          const product = await this.fetchProduct(this.productId);
          if (product) {
            await this.renderProduct(product);
            // Listen for cart updates to refresh quantity
            this.setupCartUpdateListener();

            // Dispatch custom event to notify that display card data is loaded
            // This allows product-form-display-card to update the price
            this.dispatchEvent(
              new CustomEvent("display-card-loaded", {
                detail: {
                  variantId: product.variants[0]?.id,
                  price: product.variants[0]?.price,
                  available: product.variants[0]?.available,
                },
                bubbles: true,
              })
            );
          } else {
            this.showError("Display card product not found.");
          }
        } catch (error) {
          console.error("Error loading display card:", error);
          this.showError("Error loading display card. Please try again later.");
        }
      }

      setupCartUpdateListener() {
        // Listen for cart updates via pubsub
        if (
          typeof subscribe === "function" &&
          typeof PUB_SUB_EVENTS !== "undefined"
        ) {
          this.cartUpdateUnsubscriber = subscribe(
            PUB_SUB_EVENTS.cartUpdate,
            async () => {
              // Refresh cart quantity display
              const quantityInput = this.querySelector(".quantity__input");
              if (quantityInput && quantityInput.dataset.variantId) {
                const variantId = parseInt(quantityInput.dataset.variantId);
                const cartQty = await this.getCartQuantity(variantId);
                quantityInput.setAttribute("data-cart-quantity", cartQty);

                // Update cart quantity display
                const cartQtySpan = this.querySelector(".quantity__rules-cart");
                if (cartQtySpan) {
                  if (cartQty > 0) {
                    cartQtySpan.classList.remove("hidden");
                    cartQtySpan.querySelector(
                      "span"
                    ).textContent = `(${cartQty} in cart)`;
                  } else {
                    cartQtySpan.classList.add("hidden");
                  }
                }
              }
            }
          );
        }
      }

      disconnectedCallback() {
        if (this.cartUpdateUnsubscriber) {
          this.cartUpdateUnsubscriber();
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
        return null; // Return null if no product found
      }

      async getCartQuantity(variantId) {
        try {
          // Fetch current cart
          const response = await fetch("/cart.js");
          const cart = await response.json();

          if (cart && cart.items) {
            const item = cart.items.find(
              (item) => item.variant_id === variantId
            );
            return item ? item.quantity : 0;
          }
        } catch (error) {
          console.warn("Error fetching cart quantity:", error);
        }
        return 0;
      }

      async renderProduct(product) {
        const variant =
          product.variants && product.variants.length > 0
            ? product.variants[0]
            : null;

        if (!variant) {
          this.showError("Product variant not found.");
          return;
        }

        const cartQty = await this.getCartQuantity(variant.id);
        const isAvailable = variant.available !== false;
        const quantityMin = 1; // Default quantity should always be 1
        const quantityMax =
          variant.inventory_quantity > 0 ? variant.inventory_quantity : null;

        // Get featured image from images array
        let featuredImage = null;
        if (product.images && product.images.length > 0) {
          // Use first image from images array
          featuredImage = product.images[0].src || product.images[0];
        } else if (product.featured_image) {
          featuredImage = product.featured_image;
        }

        let html = "";

        // Product Image
        if (featuredImage) {
          // Handle both string URLs and object with src property
          const imageSrc =
            typeof featuredImage === "string"
              ? featuredImage
              : featuredImage.src || featuredImage;

          html += `
            <div class="display-card-image">
              <img 
                src="${imageSrc}" 
                alt="${this.escapeHtml(product.title)}"
                loading="lazy"
              />
            </div>
          `;
        }

        // Product Content
        html += `
          <div class="display-card-content">
            <h2 class="display-card-heading">${this.escapeHtml(
              product.title
            )}</h2>
            
            <div class="display-card-quantity-wrapper">
              <div class="product-form__quantity display-card-quantity">
                <span class="visually-hidden" id="quantity-label-${
                  this.sectionId
                }-${this.blockId}">
                  ${cartQty > 0 ? `Quantity in cart: ${cartQty}` : "Quantity"}
                </span>
                <label
                  class="quantity__label form__label"
                  for="Quantity-${this.sectionId}-${this.blockId}"
                  aria-labelledby="quantity-label-${this.sectionId}-${
          this.blockId
        }"
                >
                  <span aria-hidden="true">Quantity</span>
                  ${
                    cartQty > 0
                      ? `
                    <span class="quantity__rules-cart" aria-hidden="true">
                      (${cartQty} in cart)
                    </span>
                  `
                      : ""
                  }
                </label>
                <quantity-input 
                  class="quantity display-card-quantity-input${
                    !isAvailable ? " disabled" : ""
                  }" 
                  data-url="/products/${product.handle}" 
                  data-section="${this.sectionId}"
                  data-variant-id="${variant.id}"
                  data-variant-price="${variant.price}"
                >
                  <button 
                    class="quantity__button" 
                    name="minus" 
                    type="button"
                    ${!isAvailable ? "disabled" : ""}
                  >
                    <span class="visually-hidden">
                      Decrease quantity for ${this.escapeHtml(product.title)}
                    </span>
                    <span class="svg-wrapper">
                      ${this.getMinusIcon()}
                    </span>
                  </button>
                  <input
                    class="quantity__input"
                    type="number"
                    name="quantity"
                    id="Quantity-${this.sectionId}-${this.blockId}"
                    data-cart-quantity="${cartQty}"
                    data-variant-id="${variant.id}"
                    data-min="${quantityMin}"
                    min="${quantityMin}"
                    ${
                      quantityMax
                        ? `data-max="${quantityMax}" max="${quantityMax}"`
                        : ""
                    }
                    step="1"
                    value="${quantityMin}"
                    ${!isAvailable ? "disabled" : ""}
                  >
                  <button 
                    class="quantity__button" 
                    name="plus" 
                    type="button"
                    ${!isAvailable ? "disabled" : ""}
                  >
                    <span class="visually-hidden">
                      Increase quantity for ${this.escapeHtml(product.title)}
                    </span>
                    <span class="svg-wrapper">
                      ${this.getPlusIcon()}
                    </span>
                  </button>
                </quantity-input>
              </div>
            </div>
          </div>
        `;

        this.innerHTML = `
          <div class="display-card-container">
            ${html}
          </div>
        `;
      }

      showError(message) {
        this.innerHTML = `
          <div class="display-card-error">
            <p>${this.escapeHtml(message)}</p>
          </div>
        `;
      }

      escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
      }

      getMinusIcon() {
        return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" class="icon icon-minus" viewBox="0 0 10 2"><path fill="currentColor" fill-rule="evenodd" d="M.5 1C.5.7.7.5 1 .5h8a.5.5 0 1 1 0 1H1A.5.5 0 0 1 .5 1" clip-rule="evenodd"/></svg>';
      }

      getPlusIcon() {
        return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" class="icon icon-plus" viewBox="0 0 10 10"><path fill="currentColor" fill-rule="evenodd" d="M1 4.51a.5.5 0 0 0 0 1h3.5l.01 3.5a.5.5 0 0 0 1-.01V5.5l3.5-.01a.5.5 0 0 0-.01-1H5.5L5.49.99a.5.5 0 0 0-1 .01v3.5l-3.5.01z" clip-rule="evenodd"/></svg>';
      }
    }
  );
}

// Initialize display card when DOM is ready
(function () {
  function initDisplayCards() {
    const displayCardBlocks = document.querySelectorAll(".display-card-block");
    displayCardBlocks.forEach((block) => {
      const container = block.querySelector(".display-card-container");
      if (container && !block.querySelector("display-card-api")) {
        // Create the custom element - constructor will set loading spinner immediately
        const apiElement = document.createElement("display-card-api");

        // The constructor has already set innerHTML with loading spinner
        // Now replace the container - spinner will be visible immediately
        container.replaceWith(apiElement);
      }
    });
  }

  // Wait for DOM to be ready, but initialize as soon as possible
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDisplayCards);
  } else {
    // DOM already ready, but wait a tiny bit to ensure styles are loaded
    setTimeout(initDisplayCards, 0);
  }
})();
