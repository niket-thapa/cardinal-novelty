class HeaderSearchToggle {
  constructor() {
    this.searchButton = document.querySelector('.header__icon--search');
    this.searchContainer = document.querySelector('.header-desktop-search');
    this.isOpen = false;
    
    this.init();
  }

  init() {
    if (!this.searchButton || !this.searchContainer) {
      console.warn('Header search elements not found');
      return;
    }

    this.bindEvents();
  }

  bindEvents() {
    // Toggle search on button click
    this.searchButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleSearch();
    });

    // Close search when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.searchContainer.contains(e.target) && 
          !this.searchButton.contains(e.target) && 
          this.isOpen) {
        this.closeSearch();
      }
    });

    // Close search on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeSearch();
      }
    });

    // Close search on window resize (mobile to desktop)
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 990 && this.isOpen) {
        this.closeSearch();
      }
    });
  }

  toggleSearch() {
    if (this.isOpen) {
      this.closeSearch();
    } else {
      this.openSearch();
    }
  }

  openSearch() {
    this.isOpen = true;
    this.searchContainer.classList.add('active');
    
    // Focus on search input if it exists
    const searchInput = this.searchContainer.querySelector('input[type="search"], input[type="text"]');
    if (searchInput) {
      setTimeout(() => {
        searchInput.focus();
      }, 300); // Wait for animation to complete
    }

    // Update button aria-expanded
    this.searchButton.setAttribute('aria-expanded', 'true');
    
    // Add body class to prevent scrolling if needed
    document.body.classList.add('search-open');
  }

  closeSearch() {
    this.isOpen = false;
    this.searchContainer.classList.remove('active');
    
    // Update button aria-expanded
    this.searchButton.setAttribute('aria-expanded', 'false');
    
    // Remove body class
    document.body.classList.remove('search-open');
  }

  // Public method to close search (useful for external calls)
  forceClose() {
    this.closeSearch();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new HeaderSearchToggle();
  });
} else {
  new HeaderSearchToggle();
}

// Export for potential external use
window.HeaderSearchToggle = HeaderSearchToggle;



