if (!customElements.get("display-card-api")) {
  customElements.define(
    "display-card-api",
    class DisplayCardApi extends HTMLElement {
      constructor() {
        super();
        this.productId = window.displayCardData?.productId;
        this.sectionId = window.displayCardData?.sectionId;
        this.blockId = window.displayCardData?.blockId;
        this.productHandle = window.displayCardData?.productHandle;
      }

      connectedCallback() {
        // Show loading state immediately when connected to DOM
        this.showLoading();

        // Start fetching product data
        this.loadProduct();

        // Set up MutationObserver to re-attach listeners if DOM is replaced
        this.setupMutationObserver();
      }

      setupMutationObserver() {
        // Observe changes to the element's children
        // This ensures listeners are re-attached if innerHTML is replaced
        if (this.observer) {
          this.observer.disconnect();
        }

        this.observer = new MutationObserver((mutations) => {
          // Check if quantity input was added or replaced
          const hasQuantityInput =
            this.querySelector("quantity-input") ||
            this.querySelector(".quantity__input");

          // Re-attach listeners if elements exist but listeners might not be attached
          // Use a debounce to avoid multiple rapid calls
          if (hasQuantityInput) {
            clearTimeout(this.setupListenerTimeout);
            this.setupListenerTimeout = setTimeout(() => {
              // Always re-setup listeners when DOM changes (elements might have been replaced)
              this.setupQuantityChangeListener();
            }, 100);
          }
        });

        this.observer.observe(this, {
          childList: true,
          subtree: true,
        });
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
        if (!this.productHandle && !this.productId) {
          this.innerHTML = "";
          return;
        }

        try {
          const product = this.productHandle
            ? await this.fetchProductByHandle(this.productHandle)
            : await this.fetchProduct(this.productId);

          if (product) {
            await this.renderProduct(product);
            // Listen for cart updates to refresh quantity
            this.setupCartUpdateListener();

            // Dispatch custom event to notify that display card data is loaded
            // This allows product-form-display-card to update the price
            // Convert price from cents to dollars for the event
            const priceInCents = product.variants[0]?.price || 0;
            const priceInDollars = priceInCents / 100;
            this.dispatchEvent(
              new CustomEvent("display-card-loaded", {
                detail: {
                  variantId: product.variants[0]?.id,
                  price: priceInDollars,
                  available: product.variants[0]?.available,
                },
                bubbles: true,
              })
            );
          } else {
            this.innerHTML = "";
          }
        } catch (error) {
          console.error("Error loading display card:", error);
          this.innerHTML = "";
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
        if (this.observer) {
          this.observer.disconnect();
        }
        if (this.quantityChangeHandlers) {
          this.quantityChangeHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
          });
          this.quantityChangeHandlers = [];
        }
        this.quantityListenersAttached = false;
      }

      async fetchProductByHandle(productHandle) {
        // Use Shopify.routes.root if available, otherwise use root path
        const root = window.Shopify?.routes?.root || "/";
        const url = `${root}products/${productHandle}.js`;

        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch product: ${response.status}`);
          }
          const product = await response.json();
          return product || null;
        } catch (error) {
          console.error("Error fetching product by handle:", error);
          return null;
        }
      }

      async fetchProduct(productId) {
        const response = await fetch(
          `/products.json?limit=1000&ids=${productId}`
        );
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
          this.innerHTML = "";
          return;
        }

        const cartQty = await this.getCartQuantity(variant.id);
        const isAvailable = variant.available !== false;
        const quantityMin = 0; // Default quantity starts at 0
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
        const formattedPrice = this.formatMoney(variant.price);
        html += `
          <div class="display-card-content">
            <h2 class="display-card-heading">ADD PAPER DISPLAY CARD - ${formattedPrice}</h2>
            
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
                  data-variant-price="${variant.price / 100}"
                >
                  <button 
                    class="quantity__button" 
                    name="minus" 
                    type="button"
                    ${!isAvailable || quantityMin <= 0 ? "disabled" : ""}
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

        // Set up quantity change listeners after rendering
        this.setupQuantityChangeListener();
      }

      setupQuantityChangeListener() {
        // Clear any existing listeners to avoid duplicates
        if (this.quantityChangeHandlers) {
          this.quantityChangeHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
          });
        }
        this.quantityChangeHandlers = [];

        // Wait a bit for the quantity-input custom element to be defined
        const setupListeners = () => {
          const quantityInputElement = this.querySelector("quantity-input");
          const quantityInput = this.querySelector(".quantity__input");

          if (!quantityInputElement && !quantityInput) {
            // Retry if elements not ready yet (max 10 attempts)
            if (!this.setupRetries) {
              this.setupRetries = 0;
            }
            if (this.setupRetries < 10) {
              this.setupRetries++;
              setTimeout(setupListeners, 100);
            }
            return;
          }

          this.setupRetries = 0; // Reset retry counter on success

          // Handler to dispatch custom event when quantity changes
          const handleQuantityChange = (event) => {
            const input = event.target;
            const quantity = parseInt(input.value) || 0;

            // Dispatch custom event that bubbles up
            this.dispatchEvent(
              new CustomEvent("display-card-quantity-change", {
                detail: {
                  quantity: quantity,
                  variantId:
                    input.dataset.variantId ||
                    quantityInputElement?.dataset.variantId,
                },
                bubbles: true,
              })
            );
          };

          // Listen on the input element
          if (quantityInput) {
            quantityInput.addEventListener("change", handleQuantityChange);
            quantityInput.addEventListener("input", handleQuantityChange);
            this.quantityChangeHandlers.push(
              {
                element: quantityInput,
                event: "change",
                handler: handleQuantityChange,
              },
              {
                element: quantityInput,
                event: "input",
                handler: handleQuantityChange,
              }
            );
          }

          // Listen on the quantity-input custom element
          if (quantityInputElement) {
            quantityInputElement.addEventListener(
              "change",
              handleQuantityChange
            );
            this.quantityChangeHandlers.push({
              element: quantityInputElement,
              event: "change",
              handler: handleQuantityChange,
            });

            // Also listen to the inner input
            const innerInput =
              quantityInputElement.querySelector(".quantity__input");
            if (innerInput) {
              innerInput.addEventListener("change", handleQuantityChange);
              innerInput.addEventListener("input", handleQuantityChange);
              this.quantityChangeHandlers.push(
                {
                  element: innerInput,
                  event: "change",
                  handler: handleQuantityChange,
                },
                {
                  element: innerInput,
                  event: "input",
                  handler: handleQuantityChange,
                }
              );
            }
          }

          // Listen for button clicks (plus/minus buttons)
          const minusButton = this.querySelector(
            '.quantity__button[name="minus"]'
          );
          const plusButton = this.querySelector(
            '.quantity__button[name="plus"]'
          );

          const handleButtonClick = (isPlus) => {
            return () => {
              setTimeout(() => {
                const input = this.querySelector(".quantity__input");
                if (input) {
                  handleQuantityChange({ target: input });
                }
              }, 150);
            };
          };

          if (minusButton) {
            const handler = handleButtonClick(false);
            minusButton.addEventListener("click", handler);
            this.quantityChangeHandlers.push({
              element: minusButton,
              event: "click",
              handler: handler,
            });
          }

          if (plusButton) {
            const handler = handleButtonClick(true);
            plusButton.addEventListener("click", handler);
            this.quantityChangeHandlers.push({
              element: plusButton,
              event: "click",
              handler: handler,
            });
          }

          // Mark listeners as attached
          this.quantityListenersAttached = true;
        };

        // Start setting up listeners
        setupListeners();
      }

      showError(message) {
        this.innerHTML = "";
      }

      escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
      }

      formatMoney(price) {
        // Convert price from cents to dollars (Shopify APIs return prices in cents)
        const dollars = parseFloat(price) / 100;
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(dollars);
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
