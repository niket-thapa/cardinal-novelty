if (!customElements.get("product-form-display-card")) {
  customElements.define(
    "product-form-display-card",
    class ProductFormDisplayCard extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector("form");
        if (!this.form) {
          console.error("Product form not found");
          return;
        }

        this.variantIdInput = this.form.querySelector("[name=id]");
        if (this.variantIdInput) {
          this.variantIdInput.disabled = false;
        }

        this.form.addEventListener("submit", this.onSubmitHandler.bind(this));

        // Safely get cart element
        const cartNotification = document.querySelector("cart-notification");
        const cartDrawer = document.querySelector("cart-drawer");
        this.cart = cartNotification || cartDrawer;

        this.submitButton = this.querySelector('[type="submit"]');
        if (!this.submitButton) {
          console.error("Submit button not found");
          return;
        }

        this.submitButtonText = this.submitButton.querySelector(
          ".product-form__submit-text"
        );
        if (this.submitButtonText) {
          this.combinedPriceText = this.submitButtonText.querySelector(
            ".combined-price-text"
          );
          this.combinedPriceAmount = this.submitButtonText.querySelector(
            ".combined-price-amount"
          );
        }

        if (cartDrawer && this.submitButton) {
          this.submitButton.setAttribute("aria-haspopup", "dialog");
        }

        this.hideErrors = this.dataset.hideErrors === "true";

        // Display card data - try to get from dataset first, then from API element
        this.displayCardVariantId = this.dataset.displayCardVariantId;
        this.displayCardPrice = parseInt(this.dataset.displayCardPrice) || 0;
        this.displayCardAvailable =
          this.dataset.displayCardAvailable === "true";

        // Get main product price from variant input
        this.mainProductVariantId = this.variantIdInput.value;
        this.mainProductPrice = 0; // Will be updated from variant change

        // If not in dataset, try to get from display-card-api element
        if (!this.displayCardVariantId || !this.displayCardPrice) {
          // Wait a bit for the API element to load, then try to get data
          setTimeout(() => {
            this.loadDisplayCardDataFromAPI();
          }, 500);
        }

        // Listen for display card quantity changes
        this.setupDisplayCardQuantityListener();

        // Listen for main product variant changes
        this.setupVariantChangeListener();

        // Listen for display card loaded event
        this.displayCardLoadedHandler = (event) => {
          if (event.detail) {
            if (event.detail.variantId) {
              this.displayCardVariantId = event.detail.variantId;
              console.log(
                "Display card variant ID loaded:",
                this.displayCardVariantId
              );
            }
            if (event.detail.price) {
              // Price from API is in dollars (e.g., "1.00"), convert to cents
              const priceInDollars = parseFloat(event.detail.price) || 0;
              this.displayCardPrice = Math.round(priceInDollars * 100);
              console.log(
                "Display card price loaded from event:",
                this.displayCardPrice,
                "cents"
              );
            }
            if (event.detail.available !== undefined) {
              this.displayCardAvailable = event.detail.available;
            }
            // Re-setup quantity listener after display card is loaded
            this.setupDisplayCardQuantityListener();
            this.updateCombinedPrice();
          }
        };
        document.addEventListener(
          "display-card-loaded",
          this.displayCardLoadedHandler
        );

        // Initial price update (will be called again after API data loads)
        this.updateCombinedPrice();
      }

      loadDisplayCardDataFromAPI() {
        // Find display-card-api element and get variant data
        const displayCardApi = document.querySelector("display-card-api");
        if (!displayCardApi) {
          // If API element not found yet, try again after a delay
          if (!this.loadDisplayCardRetries) {
            this.loadDisplayCardRetries = 0;
          }
          if (this.loadDisplayCardRetries < 10) {
            this.loadDisplayCardRetries++;
            setTimeout(() => {
              this.loadDisplayCardDataFromAPI();
            }, 500);
          }
          return;
        }

        // Try to get data from quantity-input element's data attributes first
        const quantityInputElement =
          displayCardApi.querySelector("quantity-input");
        if (quantityInputElement) {
          const variantId = quantityInputElement.dataset.variantId;
          const variantPrice = quantityInputElement.dataset.variantPrice;

          if (variantId && !this.displayCardVariantId) {
            this.displayCardVariantId = variantId;
          }
          if (variantPrice && !this.displayCardPrice) {
            // Price from API is in dollars (e.g., "1.00"), convert to cents
            const priceInDollars = parseFloat(variantPrice) || 0;
            this.displayCardPrice = Math.round(priceInDollars * 100);
            console.log(
              "Display card price loaded from quantity-input:",
              this.displayCardPrice,
              "cents"
            );
          }

          // Check if available (not disabled)
          if (quantityInputElement.classList.contains("disabled")) {
            this.displayCardAvailable = false;
          } else if (!this.displayCardAvailable) {
            this.displayCardAvailable = true;
          }

          // Update price after loading data
          this.updateCombinedPrice();
          return;
        }

        // Fallback: try to get from quantity input inside
        const quantityInput = displayCardApi.querySelector(".quantity__input");
        if (quantityInput) {
          const variantId = quantityInput.dataset.variantId;
          const variantPrice = quantityInput.dataset.variantPrice;

          if (variantId && !this.displayCardVariantId) {
            this.displayCardVariantId = variantId;
          }
          if (variantPrice && !this.displayCardPrice) {
            // Price from API is in dollars (e.g., "1.00"), convert to cents
            const priceInDollars = parseFloat(variantPrice) || 0;
            this.displayCardPrice = Math.round(priceInDollars * 100);
            console.log(
              "Display card price loaded from .quantity__input:",
              this.displayCardPrice,
              "cents"
            );
          }

          // Update price after loading data
          this.updateCombinedPrice();
          return;
        }

        // If not found yet, try again after a delay (max 10 attempts)
        if (!this.loadDisplayCardRetries) {
          this.loadDisplayCardRetries = 0;
        }
        if (this.loadDisplayCardRetries < 10) {
          this.loadDisplayCardRetries++;
          setTimeout(() => {
            this.loadDisplayCardDataFromAPI();
          }, 500);
        } else {
          console.warn(
            "Failed to load display card data after multiple attempts"
          );
        }
      }

      setupDisplayCardQuantityListener() {
        // Find display card quantity input - use a function to retry if not found
        const setupListeners = () => {
          const displayCardBlock = document.querySelector(
            ".display-card-block"
          );
          if (!displayCardBlock) {
            // Retry after a delay if block not found yet
            setTimeout(setupListeners, 500);
            return;
          }

          const quantityInput =
            displayCardBlock.querySelector(".quantity__input");
          if (!quantityInput) {
            // Retry after a delay if input not found yet
            setTimeout(setupListeners, 500);
            return;
          }

          // Listen for quantity changes on the input
          const handleQuantityChange = () => {
            this.updateCombinedPrice();
          };

          quantityInput.addEventListener("change", handleQuantityChange);
          quantityInput.addEventListener("input", handleQuantityChange);

          // Also listen to quantity-input custom element events
          const quantityInputElement =
            displayCardBlock.querySelector("quantity-input");
          if (quantityInputElement) {
            quantityInputElement.addEventListener(
              "change",
              handleQuantityChange
            );

            // Listen to the input inside the quantity-input element
            const innerInput =
              quantityInputElement.querySelector(".quantity__input");
            if (innerInput) {
              innerInput.addEventListener("change", handleQuantityChange);
              innerInput.addEventListener("input", handleQuantityChange);
            }
          }

          // Also listen for button clicks (plus/minus buttons) - these trigger change events
          const minusButton = displayCardBlock.querySelector(
            '.quantity__button[name="minus"]'
          );
          const plusButton = displayCardBlock.querySelector(
            '.quantity__button[name="plus"]'
          );

          if (minusButton) {
            minusButton.addEventListener("click", () => {
              setTimeout(() => this.updateCombinedPrice(), 150);
            });
          }

          if (plusButton) {
            plusButton.addEventListener("click", () => {
              setTimeout(() => this.updateCombinedPrice(), 150);
            });
          }
        };

        // Start setting up listeners
        setupListeners();
      }

      setupVariantChangeListener() {
        // Listen for variant changes via pubsub (PUB_SUB_EVENTS.variantChange)
        if (
          typeof subscribe === "function" &&
          typeof PUB_SUB_EVENTS !== "undefined"
        ) {
          this.variantChangeUnsubscriber = subscribe(
            PUB_SUB_EVENTS.variantChange,
            (event) => {
              if (event && event.data && event.data.variant) {
                this.mainProductPrice = event.data.variant.price || 0;
                this.mainProductVariantId = event.data.variant.id;
                this.updateCombinedPrice();
              }
            }
          );
        }

        // Also listen to price element changes (fallback)
        const priceElement = document.querySelector(
          ".price .price-item--regular"
        );
        if (priceElement) {
          // Use MutationObserver to watch for price changes
          const observer = new MutationObserver(() => {
            this.updateCombinedPrice();
          });
          observer.observe(priceElement, {
            childList: true,
            subtree: true,
            characterData: true,
          });
        }
      }

      disconnectedCallback() {
        if (this.variantChangeUnsubscriber) {
          this.variantChangeUnsubscriber();
        }
      }

      getDisplayCardQuantity() {
        const displayCardBlock = document.querySelector(".display-card-block");
        if (!displayCardBlock) return 1;

        const quantityInput =
          displayCardBlock.querySelector(".quantity__input");
        if (!quantityInput) return 1;

        const quantity = parseInt(quantityInput.value) || 1;
        return Math.max(1, quantity);
      }

      updateCombinedPrice() {
        if (!this.combinedPriceText) {
          console.warn("combinedPriceText not found");
          return;
        }

        // Get main product price
        let mainPrice = this.mainProductPrice;
        if (mainPrice === 0) {
          // Try to get from price element
          const priceElement = document.querySelector(
            ".price .price-item--regular"
          );
          if (priceElement) {
            const priceText = priceElement.textContent.replace(/[^0-9.]/g, "");
            mainPrice = parseFloat(priceText) * 100; // Convert to cents
          }
        }

        // Get display card quantity
        const displayCardQty = this.getDisplayCardQuantity();

        // Calculate combined price
        const displayCardTotal = (this.displayCardPrice || 0) * displayCardQty;
        const combinedPrice = mainPrice + displayCardTotal;

        // Update button text and amount
        if (combinedPrice > 0 && this.displayCardPrice > 0) {
          const formattedPrice = this.formatMoney(combinedPrice);

          // Keep combined-price-text with just the "Add to cart" text
          this.combinedPriceText.textContent =
            window.variantStrings?.addToCart || "Add to cart";

          // Show the price in combined-price-amount
          if (this.combinedPriceAmount) {
            this.combinedPriceAmount.textContent = formattedPrice;
            this.combinedPriceAmount.style.display = "";
          }
        } else {
          this.combinedPriceText.textContent =
            window.variantStrings?.addToCart || "Add to cart";

          // Hide combined-price-amount if no display card price
          if (this.combinedPriceAmount) {
            this.combinedPriceAmount.style.display = "none";
          }
        }
      }

      formatMoney(cents) {
        // Simple money formatting - you may want to use Shopify's money format
        const dollars = cents / 100;
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(dollars);
      }

      async onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute("aria-disabled") === "true") return;

        this.handleErrorMessage();

        // Ensure display card data is loaded before submitting
        if (!this.displayCardVariantId || !this.displayCardPrice) {
          console.log(
            "Display card data not loaded yet, attempting to load..."
          );
          this.loadDisplayCardDataFromAPI();

          // Wait a bit and try again if still not loaded
          if (!this.displayCardVariantId || !this.displayCardPrice) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            this.loadDisplayCardDataFromAPI();
          }
        }

        // If still not loaded, try to get from DOM directly
        if (!this.displayCardVariantId || !this.displayCardPrice) {
          const displayCardApi = document.querySelector("display-card-api");
          if (displayCardApi) {
            const quantityInputElement =
              displayCardApi.querySelector("quantity-input");
            if (quantityInputElement) {
              if (!this.displayCardVariantId) {
                this.displayCardVariantId =
                  quantityInputElement.dataset.variantId;
              }
              if (!this.displayCardPrice) {
                const priceInDollars =
                  parseFloat(quantityInputElement.dataset.variantPrice) || 0;
                this.displayCardPrice = Math.round(priceInDollars * 100);
              }
            }
          }
        }

        this.submitButton.setAttribute("aria-disabled", true);
        this.submitButton.classList.add("loading");
        const loadingSpinner = this.querySelector(".loading__spinner");
        if (loadingSpinner) loadingSpinner.classList.remove("hidden");

        try {
          // Get quantities
          const mainProductQty =
            parseInt(this.form.querySelector('[name="quantity"]')?.value) || 1;
          const displayCardQty = this.getDisplayCardQuantity();

          // Ensure main product variant ID is set
          if (!this.mainProductVariantId && this.variantIdInput) {
            this.mainProductVariantId = this.variantIdInput.value;
          }

          console.log("Adding to cart:", {
            mainProductVariantId: this.mainProductVariantId,
            mainProductQty: mainProductQty,
            displayCardVariantId: this.displayCardVariantId,
            displayCardQty: displayCardQty,
            displayCardAvailable: this.displayCardAvailable,
            displayCardPrice: this.displayCardPrice,
          });

          if (!this.mainProductVariantId) {
            throw new Error("Main product variant ID is missing");
          }

          // Add main product to cart (without sections for first add)
          const mainProductResponse = await this.addToCart(
            this.mainProductVariantId.toString(),
            mainProductQty,
            false // Don't include sections for first add
          );

          if (mainProductResponse.status) {
            throw new Error(
              mainProductResponse.description ||
                "Failed to add main product to cart"
            );
          }

          // Add display card product to cart WITH sections (this gives us updated cart with sections)
          let cartResponse = null;

          // Always try to add display card if we have variant ID and quantity > 0
          // Only skip if explicitly unavailable
          if (this.displayCardVariantId && displayCardQty > 0) {
            // Check availability - default to true if not set
            const isAvailable = this.displayCardAvailable !== false;

            if (isAvailable) {
              console.log(
                "Adding display card to cart:",
                this.displayCardVariantId,
                displayCardQty
              );
              cartResponse = await this.addToCart(
                this.displayCardVariantId.toString(), // Ensure it's a string
                displayCardQty,
                true // Include sections for second add to get updated cart
              );

              if (cartResponse.status) {
                throw new Error(
                  cartResponse.description ||
                    "Failed to add display card to cart"
                );
              }
            } else {
              console.warn("Display card is not available, skipping");
            }
          } else {
            console.warn("Display card not added:", {
              hasVariantId: !!this.displayCardVariantId,
              variantId: this.displayCardVariantId,
              available: this.displayCardAvailable,
              qty: displayCardQty,
            });
            // If no display card, fetch cart with sections after main product add
            if (
              this.cart &&
              typeof this.cart.getSectionsToRender === "function"
            ) {
              const sectionsToRender = this.cart.getSectionsToRender();
              const sectionIds = sectionsToRender
                .map((section) => section.id || section.section)
                .filter(Boolean);

              if (sectionIds.length > 0) {
                const cartUrl = `${
                  (window.routes && window.routes.cart_url) || "/cart"
                }.js`;
                const sectionsParam = sectionIds.join(",");
                const fetchUrl = `${cartUrl}?sections=${encodeURIComponent(
                  sectionsParam
                )}`;
                const response = await fetch(fetchUrl);
                cartResponse = await response.json();
              }
            }
          }

          // Update cart UI and open drawer (using response from last add or fetched cart)
          if (this.cart && cartResponse && !cartResponse.status) {
            // Set active element like default behavior
            if (typeof this.cart.setActiveElement === "function") {
              this.cart.setActiveElement(document.activeElement);
            }

            // Publish cart update event if available (like default behavior)
            if (
              typeof publish === "function" &&
              typeof PUB_SUB_EVENTS !== "undefined"
            ) {
              const startMarker =
                typeof CartPerformance !== "undefined" &&
                CartPerformance.createStartingMarker
                  ? CartPerformance.createStartingMarker(
                      "add:wait-for-subscribers"
                    )
                  : null;

              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: "product-form-display-card",
                productVariantId: this.mainProductVariantId,
                cartData: cartResponse,
              }).then(() => {
                if (startMarker && CartPerformance.measureFromMarker) {
                  CartPerformance.measureFromMarker(
                    "add:wait-for-subscribers",
                    startMarker
                  );
                }
              });
            }

            // Render cart contents (this will automatically open the drawer/notification)
            if (typeof this.cart.renderContents === "function") {
              if (
                typeof CartPerformance !== "undefined" &&
                CartPerformance.measure
              ) {
                CartPerformance.measure("add:paint-updated-sections", () => {
                  this.cart.renderContents(cartResponse);
                });
              } else {
                this.cart.renderContents(cartResponse);
              }
            } else if (typeof this.cart.open === "function") {
              // If renderContents doesn't exist, try to open manually
              this.cart.open(this.submitButton);
            }
          } else if (this.cart && typeof this.cart.open === "function") {
            // Fallback: try to open drawer manually
            this.cart.open(this.submitButton);
          } else if (!this.cart) {
            // No cart element found, redirect to cart page
            window.location =
              (window.routes && window.routes.cart_url) || "/cart";
          }

          this.error = false;
        } catch (error) {
          console.error("Error adding to cart:", error);
          if (
            typeof publish === "function" &&
            typeof PUB_SUB_EVENTS !== "undefined"
          ) {
            publish(PUB_SUB_EVENTS.cartError, {
              source: "product-form-display-card",
              productVariantId: this.mainProductVariantId,
              errors: error.message,
              message: error.message,
            });
          }
          this.handleErrorMessage(error.message);
          this.error = true;
        } finally {
          this.submitButton.classList.remove("loading");
          if (loadingSpinner) loadingSpinner.classList.add("hidden");
          if (this.cart && this.cart.classList.contains("is-empty")) {
            this.cart.classList.remove("is-empty");
          }
          if (!this.error) {
            this.submitButton.removeAttribute("aria-disabled");
          }
        }
      }

      async addToCart(variantId, quantity, includeSections = false) {
        // Use fetchConfig if available, otherwise create basic config
        const config =
          typeof fetchConfig === "function"
            ? fetchConfig("javascript")
            : {
                method: "POST",
                headers: {
                  "X-Requested-With": "XMLHttpRequest",
                },
              };

        const formData = new FormData();
        formData.append("id", variantId);
        formData.append("quantity", quantity);

        // Add sections if requested (for the last add to get updated cart with sections)
        if (
          includeSections &&
          this.cart &&
          typeof this.cart.getSectionsToRender === "function"
        ) {
          try {
            const sections = this.cart.getSectionsToRender();
            if (sections && Array.isArray(sections)) {
              formData.append(
                "sections",
                sections
                  .map((section) => section.id || section.section)
                  .filter(Boolean)
              );
              formData.append("sections_url", window.location.pathname);
            }
          } catch (error) {
            console.warn("Error getting sections to render:", error);
          }
        }

        // For FormData, we need to delete Content-Type header
        if (config.headers && config.headers["Content-Type"]) {
          delete config.headers["Content-Type"];
        }
        config.body = formData;

        const cartAddUrl =
          (window.routes && window.routes.cart_add_url) || "/cart/add.js";
        const response = await fetch(cartAddUrl, config);
        return await response.json();
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper ||
          this.querySelector(".product-form__error-message-wrapper");
        if (!this.errorMessageWrapper) return;
        this.errorMessage =
          this.errorMessage ||
          this.errorMessageWrapper.querySelector(
            ".product-form__error-message"
          );

        this.errorMessageWrapper.toggleAttribute("hidden", !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }
    }
  );
}
