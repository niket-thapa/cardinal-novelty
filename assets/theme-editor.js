function hideProductModal() {
  const productModal = document.querySelectorAll('product-modal[open]');
  productModal && productModal.forEach((modal) => modal.hide());

  var flickityList = document.querySelectorAll("[data-flickity]");
  var flickityResponsiveList = document.querySelectorAll(
    "[data-flickity-responsive]"
  );

  for (var i = 0, t = flickityList.length; i < t; i++) {
    var flkty = Flickity.data(flickityList[i]);
    if (!flkty) {
      var flktyData = flickityList[i].getAttribute("data-flickity");
      if (flktyData) {
        var flktyOptions = JSON.parse(flktyData);
        new Flickity(flickityList[i], flktyOptions);
      } else {
        new Flickity(flickityList[i]);
      }
    }
  }

  for (var i = 0, t = flickityResponsiveList.length; i < t; i++) {
    var flkty = Flickity.data(flickityResponsiveList[i]);
    if (!flkty) {
      var flktyData = flickityResponsiveList[i].getAttribute(
        "data-flickity-responsive"
      );
      if (flktyData) {
        var flktyOptions = JSON.parse(flktyData);
        new FlickityResponsive(flickityResponsiveList[i], flktyOptions);
      } else {
        new FlickityResponsive(flickityResponsiveList[i]);
      }
    }
  }
}

document.addEventListener('shopify:block:select', function (event) {
  hideProductModal();
  const blockSelectedIsSlide = event.target.classList.contains('slideshow__slide');
  if (!blockSelectedIsSlide) return;

  const parentSlideshowComponent = event.target.closest('slideshow-component');
  parentSlideshowComponent.pause();

  setTimeout(function () {
    parentSlideshowComponent.slider.scrollTo({
      left: event.target.offsetLeft,
    });
  }, 200);
});

document.addEventListener('shopify:block:deselect', function (event) {
  const blockDeselectedIsSlide = event.target.classList.contains('slideshow__slide');
  if (!blockDeselectedIsSlide) return;
  const parentSlideshowComponent = event.target.closest('slideshow-component');
  if (parentSlideshowComponent.autoplayButtonIsSetToPlay) parentSlideshowComponent.play();
});

document.addEventListener('shopify:section:load', () => {
  hideProductModal();
  const zoomOnHoverScript = document.querySelector('[id^=EnableZoomOnHover]');
  if (!zoomOnHoverScript) return;
  if (zoomOnHoverScript) {
    const newScriptTag = document.createElement('script');
    newScriptTag.src = zoomOnHoverScript.src;
    zoomOnHoverScript.parentNode.replaceChild(newScriptTag, zoomOnHoverScript);
  }
});

document.addEventListener('shopify:section:unload', (event) => {
  document.querySelectorAll(`[data-section="${event.detail.sectionId}"]`).forEach((element) => {
    element.remove();
    document.body.classList.remove('overflow-hidden');
  });
});

document.addEventListener('shopify:section:reorder', () => hideProductModal());

document.addEventListener('shopify:section:select', () => hideProductModal());

document.addEventListener('shopify:section:deselect', () => hideProductModal());

document.addEventListener('shopify:inspector:activate', () => hideProductModal());

document.addEventListener('shopify:inspector:deactivate', () => hideProductModal());
