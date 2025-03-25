class NotificationSystem {
  constructor() {
    this.container = null;
    this.timeout = null;
    this.duration = 5000;
    this.init();
  }

  init() {
    if (!document.getElementById("notification-container")) {
      this.container = document.createElement("div");
      this.container.id = "notification-container";
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById("notification-container");
    }
  }

  show(message, type = "info", duration = this.duration) {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;

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

    this.container.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    setTimeout(() => {
      notification.classList.remove("show");

      setTimeout(() => {
        notification.remove();
      }, 300);
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

const notifications = new NotificationSystem();
