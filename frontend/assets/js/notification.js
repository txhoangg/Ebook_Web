// frontend/assets/js/notification.js
class NotificationSystem {
  constructor() {
    this.container = null;
    this.timeout = null;
    this.duration = 5000; // 5 seconds default
    this.init();
  }

  init() {
    // Create notification container if it doesn't exist
    if (!document.getElementById("notification-container")) {
      this.container = document.createElement("div");
      this.container.id = "notification-container";
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById("notification-container");
    }
  }

  show(message, type = "info", duration = this.duration) {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;

    // Add icon based on type
    let icon = "";
    switch (type) {
      case "success":
        icon = '<i class="fas fa-check-circle"></i>';
        break;
      case "error":
        icon = '<i class="fas fa-exclamation-circle"></i>';
        break;
      case "warning":
        icon = '<i class="fas fa-exclamation-triangle"></i>';
        break;
      default:
        icon = '<i class="fas fa-info-circle"></i>';
    }

    notification.innerHTML = `
        <div class="notification-content">
          <div class="notification-icon">${icon}</div>
          <div class="notification-message">${message}</div>
        </div>
        <div class="notification-progress">
          <div class="notification-progress-bar"></div>
        </div>
      `;

    // Add to container
    this.container.appendChild(notification);

    // Show notification with a small delay
    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    // Remove notification after duration
    setTimeout(() => {
      notification.classList.remove("show");

      // Wait for transition to complete before removing from DOM
      setTimeout(() => {
        notification.remove();
      }, 300); // transition duration
    }, duration);
  }

  success(message, duration) {
    this.show(message, "success", duration);
  }

  error(message, duration) {
    this.show(message, "error", duration);
  }

  info(message, duration) {
    this.show(message, "info", duration);
  }

  warning(message, duration) {
    this.show(message, "warning", duration);
  }
}

// Create global instance
const notifications = new NotificationSystem();
