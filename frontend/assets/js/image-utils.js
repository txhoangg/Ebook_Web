class ImageUtils {
  constructor() {
    this.defaultCover = "/api/placeholder/220/250";
    this.defaultDetailCover = "/api/placeholder/300/450";
    this.observers = new Map();
    this.initLazyLoading();
  }

  initLazyLoading() {
    if ("IntersectionObserver" in window) {
      this.initIntersectionObserver();
    } else {

      this.loadAllImages();
    }


    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
   
              if (node.tagName === "IMG" && node.dataset.src) {
                this.setupLazyImage(node);
              }
     
              const lazyImages = node.querySelectorAll("img[data-src]");
              if (lazyImages.length > 0) {
                lazyImages.forEach((img) => this.setupLazyImage(img));
              }
            }
          });
        }
      });
    });

   
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  initIntersectionObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            this.loadImage(img);
            this.observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: "50px 0px",
        threshold: 0.01,
      }
    );
  }

  setupLazyImage(img) {

    if (!img.src) {
      img.src = this.getPlaceholder(img);
    }


    if (this.observers.has(img)) return;

  
    img.onerror = () => {
      img.onerror = null;
      img.src = this.getPlaceholder(img);
    };


    if (this.observer) {
      this.observer.observe(img);
      this.observers.set(img, true);
    } else {

      this.loadImage(img);
    }
  }

  loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;


    const tempImg = new Image();
    tempImg.onload = () => {
      img.src = src;
      img.classList.add("loaded");
    };
    tempImg.onerror = () => {
      img.src = this.getPlaceholder(img);
    };
    tempImg.src = src;


    delete img.dataset.src;
  }

  loadAllImages() {

    document.querySelectorAll("img[data-src]").forEach((img) => {
      this.loadImage(img);
    });
  }

  getPlaceholder(img) {
   
    if (
      img.classList.contains("book-detail-image") ||
      img.closest(".book-detail-image")
    ) {
      return this.defaultDetailCover;
    }
    return this.defaultCover;
  }


  processImagePath(path) {
    if (!path) return this.defaultCover;
    if (path.startsWith("http")) return path;
    if (!path.startsWith("/")) path = "/" + path;
    return path;
  }


  renderBookCover(book, size = "normal") {
    const coverPath = this.processImagePath(book.coverPath);
    const placeholder =
      size === "detail" ? this.defaultDetailCover : this.defaultCover;

    return `<img 
          src="${placeholder}" 
          data-src="${coverPath}" 
          alt="${book.title}" 
          class="book-cover-img${size === "detail" ? " detail-size" : ""}"
          loading="lazy">`;
  }
}


const imageUtils = new ImageUtils();


function convertToLazyImages() {
  document.querySelectorAll("img[src]:not([data-src])").forEach((img) => {
   
    if (img.classList.contains("loaded") || img.src.includes("data:image"))
      return;

  
    img.dataset.src = img.src;
    img.src = imageUtils.getPlaceholder(img);


    imageUtils.setupLazyImage(img);
  });
}


document.addEventListener("DOMContentLoaded", () => {

  setTimeout(convertToLazyImages, 500);
});
