if (!customElements.get("product-form")) {
  customElements.define(
    "product-form",
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector("form");
        this.variantIdInput.disabled = false;
        this.form.addEventListener("submit", this.onSubmitHandler.bind(this));
        this.cart =
          document.querySelector("cart-notification") ||
          document.querySelector("cart-drawer");
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText =
          this.submitButton.querySelector(".product-form__submit-text") ||
          this.submitButton.querySelector("span");

        // Get price elements
        if (this.submitButtonText) {
          this.combinedPriceText = this.submitButtonText.querySelector(
            ".combined-price-text"
          );
          this.combinedPriceAmount = this.submitButtonText.querySelector(
            ".combined-price-amount"
          );
        }

        if (document.querySelector("cart-drawer"))
          this.submitButton.setAttribute("aria-haspopup", "dialog");

        this.hideErrors = this.dataset.hideErrors === "true";

        // Get main product price from variant input (will be updated on variant change)
        this.mainProductPrice = 0;
        this.mainProductVariantId = this.variantIdInput.value;

        // Setup listeners for quantity changes and variant changes
        this.setupQuantityListener();
        this.setupVariantChangeListener();
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute("aria-disabled") === "true") return;

        this.handleErrorMessage();

        this.submitButton.setAttribute("aria-disabled", true);
        this.submitButton.classList.add("loading");
        this.querySelector(".loading__spinner").classList.remove("hidden");

        const config = fetchConfig("javascript");
        config.headers["X-Requested-With"] = "XMLHttpRequest";
        delete config.headers["Content-Type"];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            "sections",
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append("sections_url", window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: "product-form",
                productVariantId: formData.get("id"),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage =
                this.submitButton.querySelector(".sold-out-message");
              if (!soldOutMessage) return;
              this.submitButton.setAttribute("aria-disabled", true);
              this.submitButtonText.classList.add("hidden");
              soldOutMessage.classList.remove("hidden");
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            const startMarker = CartPerformance.createStartingMarker(
              "add:wait-for-subscribers"
            );
            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: "product-form",
                productVariantId: formData.get("id"),
                cartData: response,
              }).then(() => {
                CartPerformance.measureFromMarker(
                  "add:wait-for-subscribers",
                  startMarker
                );
              });
            this.error = false;

            // Reset quantity to 1 and update price after successful add
            this.resetQuantityAndPrice();

            const quickAddModal = this.closest("quick-add-modal");
            if (quickAddModal) {
              document.body.addEventListener(
                "modalClosed",
                () => {
                  setTimeout(() => {
                    CartPerformance.measure(
                      "add:paint-updated-sections",
                      () => {
                        this.cart.renderContents(response);
                      }
                    );
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              CartPerformance.measure("add:paint-updated-sections", () => {
                this.cart.renderContents(response);
              });
            }
          })
          .catch((e) => {
            // Error handled by error message display
          })
          .finally(() => {
            this.submitButton.classList.remove("loading");
            if (this.cart && this.cart.classList.contains("is-empty"))
              this.cart.classList.remove("is-empty");
            if (!this.error) this.submitButton.removeAttribute("aria-disabled");
            this.querySelector(".loading__spinner").classList.add("hidden");

            CartPerformance.measureFromEvent("add:user-action", evt);
          });
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

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute("disabled", "disabled");
          if (text) {
            // Preserve price structure if it exists, otherwise replace text
            if (this.combinedPriceText && this.combinedPriceAmount) {
              this.combinedPriceText.textContent = text;
              this.combinedPriceAmount.style.display = "none";
            } else {
              this.submitButtonText.textContent = text;
            }
          }
        } else {
          this.submitButton.removeAttribute("disabled");
          // Ensure price structure exists, recreate if missing
          if (!this.combinedPriceText || !this.combinedPriceAmount) {
            // Try to re-find elements first
            if (this.submitButtonText) {
              this.combinedPriceText = this.submitButtonText.querySelector(
                ".combined-price-text"
              );
              this.combinedPriceAmount = this.submitButtonText.querySelector(
                ".combined-price-amount"
              );
            }
            // If still missing, recreate the structure
            if (!this.combinedPriceText || !this.combinedPriceAmount) {
              this.submitButtonText.innerHTML = `
                <span class="combined-price-text">${window.variantStrings.addToCart}</span>
                <span>•</span>
                <span class="combined-price-amount"></span>
              `;
              // Re-find the elements after creating them
              this.combinedPriceText = this.submitButtonText.querySelector(
                ".combined-price-text"
              );
              this.combinedPriceAmount = this.submitButtonText.querySelector(
                ".combined-price-amount"
              );
            }
          }
          // Update the text and show price
          if (this.combinedPriceText) {
            this.combinedPriceText.textContent =
              window.variantStrings.addToCart;
          }
          if (this.combinedPriceAmount) {
            this.combinedPriceAmount.style.display = "";
            // Update price after enabling
            this.updatePrice();
          }
        }
      }

      get variantIdInput() {
        return this.form.querySelector("[name=id]");
      }

      setupQuantityListener() {
        // Get section ID from data-section-id attribute
        const sectionId = this.dataset.sectionId;

        // Get the actual element reference
        const setupListeners = () => {
          let mainQuantityInput = null;
          if (sectionId) {
            mainQuantityInput = document.getElementById(
              `Quantity-${sectionId}`
            );
            // Verify it has the correct class
            if (
              mainQuantityInput &&
              !mainQuantityInput.classList.contains("quantity__input")
            ) {
              mainQuantityInput = null;
            }
          }

          if (!mainQuantityInput) {
            // Retry after a delay if element not found yet
            setTimeout(setupListeners, 500);
            return;
          }

          // Handler function
          const handleQuantityChange = () => {
            this.updatePrice();
          };

          // Listen directly on the input element
          mainQuantityInput.addEventListener("change", handleQuantityChange);
          mainQuantityInput.addEventListener("input", handleQuantityChange);

          // Also listen to quantity-input custom element if it exists
          const quantityInputElement =
            mainQuantityInput.closest("quantity-input");
          if (quantityInputElement) {
            quantityInputElement.addEventListener(
              "change",
              handleQuantityChange
            );
          }

          // Listen for button clicks (plus/minus buttons)
          if (quantityInputElement) {
            const minusButton = quantityInputElement.querySelector(
              '.quantity__button[name="minus"]'
            );
            const plusButton = quantityInputElement.querySelector(
              '.quantity__button[name="plus"]'
            );

            if (minusButton) {
              minusButton.addEventListener("click", () => {
                setTimeout(() => {
                  this.updatePrice();
                }, 150);
              });
            }

            if (plusButton) {
              plusButton.addEventListener("click", () => {
                setTimeout(() => {
                  this.updatePrice();
                }, 150);
              });
            }
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
                this.updatePrice();
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
            this.updatePrice();
          });
          observer.observe(priceElement, {
            childList: true,
            subtree: true,
            characterData: true,
          });
        }
      }

      getMainProductQuantity() {
        // Get section ID from data-section-id attribute
        const sectionId = this.dataset.sectionId;

        // The input has form attribute but is not a child of the form
        // So we need to search in document, not this.form
        if (sectionId) {
          // Use getElementById (most reliable for IDs)
          const quantityInput = document.getElementById(
            `Quantity-${sectionId}`
          );
          if (
            quantityInput &&
            quantityInput.classList.contains("quantity__input")
          ) {
            const quantity = parseInt(quantityInput.value) || 1;
            return Math.max(1, quantity);
          }
        }

        // Fallback: find input directly
        const mainProductQuantityInput = document.querySelector(
          'input[name="quantity"].quantity__input:not(.display-card-quantity .quantity__input):not(quantity-input .quantity__input)'
        );
        if (!mainProductQuantityInput) return 1;

        const quantity = parseInt(mainProductQuantityInput.value) || 1;
        return Math.max(1, quantity);
      }

      updatePrice() {
        if (!this.combinedPriceAmount) {
          // Try to re-find the elements in case HTML was replaced
          if (this.submitButtonText) {
            this.combinedPriceText = this.submitButtonText.querySelector(
              ".combined-price-text"
            );
            this.combinedPriceAmount = this.submitButtonText.querySelector(
              ".combined-price-amount"
            );
          }
          if (!this.combinedPriceAmount) {
            return;
          }
        }

        // Get main product price
        let mainPrice = this.mainProductPrice;
        let compareAtPrice = 0;

        if (mainPrice === 0) {
          // Try to get from price element
          const priceContainer = document.querySelector(".price");
          if (priceContainer) {
            const regularPriceElement = priceContainer.querySelector(
              ".price-item--regular:not(s)"
            );
            const salePriceElement =
              priceContainer.querySelector(".price-item--sale");
            const comparePriceElement = priceContainer.querySelector(
              "s.price-item--regular"
            );

            if (salePriceElement) {
              const priceText = salePriceElement.textContent.replace(
                /[^0-9.]/g,
                ""
              );
              mainPrice = parseFloat(priceText) * 100; // Convert to cents
            } else if (regularPriceElement) {
              const priceText = regularPriceElement.textContent.replace(
                /[^0-9.]/g,
                ""
              );
              mainPrice = parseFloat(priceText) * 100; // Convert to cents
            }

            if (comparePriceElement) {
              const compareText = comparePriceElement.textContent.replace(
                /[^0-9.]/g,
                ""
              );
              compareAtPrice = parseFloat(compareText) * 100; // Convert to cents
            }
          }
        }

        // Get main product quantity
        const mainProductQty = this.getMainProductQuantity();

        // Calculate total price: (main price * quantity)
        const totalPrice = mainPrice * mainProductQty;
        const totalCompareAtPrice =
          compareAtPrice > 0 ? compareAtPrice * mainProductQty : 0;

        // Update price display if we have a price
        if (totalPrice > 0 && mainPrice > 0) {
          const formattedPrice = this.formatMoney(totalPrice);
          const formattedCompareAtPrice =
            totalCompareAtPrice > 0
              ? this.formatMoney(totalCompareAtPrice)
              : null;

          // Preserve HTML structure with compare_at_price if it exists
          if (formattedCompareAtPrice && totalCompareAtPrice > totalPrice) {
            this.combinedPriceAmount.innerHTML = `<s class="price-item price-item--regular">${formattedCompareAtPrice}</s><span class="price-item price-item--sale price-item--last">${formattedPrice}</span>`;
          } else {
            this.combinedPriceAmount.innerHTML = `<span class="price-item price-item--regular">${formattedPrice}</span>`;
          }
          // Make sure price is visible
          this.combinedPriceAmount.style.display = "";
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

      resetQuantityAndPrice() {
        // Get section ID from data-section-id attribute
        const sectionId = this.dataset.sectionId;
        let quantityInput = null;

        // Find the main product quantity input
        if (sectionId) {
          quantityInput = document.getElementById(`Quantity-${sectionId}`);
          if (
            quantityInput &&
            quantityInput.classList.contains("quantity__input")
          ) {
            // Reset to 1
            quantityInput.value = 1;
            // Trigger change event to update any listeners
            quantityInput.dispatchEvent(new Event("change", { bubbles: true }));
            quantityInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }

        // Fallback: find input directly if not found by ID
        if (!quantityInput) {
          const mainProductQuantityInput = document.querySelector(
            'input[name="quantity"].quantity__input:not(.display-card-quantity .quantity__input):not(quantity-input .quantity__input)'
          );
          if (mainProductQuantityInput) {
            mainProductQuantityInput.value = 1;
            mainProductQuantityInput.dispatchEvent(
              new Event("change", { bubbles: true })
            );
            mainProductQuantityInput.dispatchEvent(
              new Event("input", { bubbles: true })
            );
          }
        }

        // Update price after resetting quantity
        setTimeout(() => {
          this.updatePrice();
        }, 100);
      }

      disconnectedCallback() {
        if (this.variantChangeUnsubscriber) {
          this.variantChangeUnsubscriber();
        }
      }
    }
  );
}
