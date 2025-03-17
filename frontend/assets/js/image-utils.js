// frontend/assets/js/image-utils.js
class ImageUtils {
  constructor() {
    this.defaultCover = "/api/placeholder/220/250";
    this.defaultDetailCover = "/api/placeholder/300/450";
    this.observers = new Map();
    this.initLazyLoading();
  }

  initLazyLoading() {
    // Kiểm tra hỗ trợ Intersection Observer API
    if ("IntersectionObserver" in window) {
      this.initIntersectionObserver();
    } else {
      // Fallback cho trình duyệt cũ
      this.loadAllImages();
    }

    // Thêm xử lý cho hình ảnh được thêm vào sau khi trang đã tải
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              // Element node
              // Xử lý nếu node là image
              if (node.tagName === "IMG" && node.dataset.src) {
                this.setupLazyImage(node);
              }
              // Xử lý nếu node có chứa images
              const lazyImages = node.querySelectorAll("img[data-src]");
              if (lazyImages.length > 0) {
                lazyImages.forEach((img) => this.setupLazyImage(img));
              }
            }
          });
        }
      });
    });

    // Theo dõi thay đổi DOM để xử lý lazy loading cho các hình ảnh mới
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
    // Gán placeholder nếu không có
    if (!img.src) {
      img.src = this.getPlaceholder(img);
    }

    // Đã được quan sát rồi, bỏ qua
    if (this.observers.has(img)) return;

    // Gắn sự kiện onerror cho ảnh
    img.onerror = () => {
      img.onerror = null;
      img.src = this.getPlaceholder(img);
    };

    // Theo dõi hình ảnh để lazy load
    if (this.observer) {
      this.observer.observe(img);
      this.observers.set(img, true);
    } else {
      // Fallback nếu không có IntersectionObserver
      this.loadImage(img);
    }
  }

  loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    // Tải ảnh và cập nhật src
    const tempImg = new Image();
    tempImg.onload = () => {
      img.src = src;
      img.classList.add("loaded");
    };
    tempImg.onerror = () => {
      img.src = this.getPlaceholder(img);
    };
    tempImg.src = src;

    // Xóa data-src để tránh tải lại
    delete img.dataset.src;
  }

  loadAllImages() {
    // Fallback cho trình duyệt không hỗ trợ IntersectionObserver
    document.querySelectorAll("img[data-src]").forEach((img) => {
      this.loadImage(img);
    });
  }

  getPlaceholder(img) {
    // Xác định placeholder phù hợp dựa trên kích thước hoặc lớp của ảnh
    if (
      img.classList.contains("book-detail-image") ||
      img.closest(".book-detail-image")
    ) {
      return this.defaultDetailCover;
    }
    return this.defaultCover;
  }

  // Sửa hàm processImagePath() trong file image-utils.js
  processImagePath(path) {
    if (!path) return this.defaultCover;
    if (path.startsWith("http")) return path;
    if (!path.startsWith("/")) path = "/" + path;
    return path;
  }

  // Render image với lazy loading
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

// Tạo instance toàn cục
const imageUtils = new ImageUtils();

// Hàm helper để chuyển đổi các hình ảnh hiện có sang lazy loading
function convertToLazyImages() {
  document.querySelectorAll("img[src]:not([data-src])").forEach((img) => {
    // Bỏ qua các ảnh đã xử lý hoặc không cần lazy load
    if (img.classList.contains("loaded") || img.src.includes("data:image"))
      return;

    // Chuyển src hiện tại sang data-src
    img.dataset.src = img.src;
    img.src = imageUtils.getPlaceholder(img);

    // Thiết lập lazy loading
    imageUtils.setupLazyImage(img);
  });
}

// Chuyển đổi sau khi trang đã tải
document.addEventListener("DOMContentLoaded", () => {
  // Đợi một chút để các hình ảnh quan trọng tải trước
  setTimeout(convertToLazyImages, 500);
});
