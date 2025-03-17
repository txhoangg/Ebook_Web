// Global state
const state = {
  isAuthenticated: false,
  currentUser: null,
  categories: [],
  featuredBooks: [],
  newBooks: [],
  isLoading: false,
};

/**
 * Hàm tiện ích để lấy đường dẫn chính xác dựa trên vị trí hiện tại
 */
// Thay đổi hàm này trong main.js
// Current function (problematic):
function getCorrectPath(path) {
  // Nếu đường dẫn đã bắt đầu bằng '/' tức là đường dẫn tuyệt đối, trả về nguyên bản.
  if (path.startsWith("/")) {
    return path;
  }

  // Nếu trang hiện tại nằm trong thư mục "pages"
  if (window.location.pathname.includes("/pages/")) {
    // Nếu path bắt đầu bằng "pages/", loại bỏ phần "pages/" để không bị lặp.
    if (path.startsWith("pages/")) {
      return path.replace(/^pages\//, "");
    }
    return path;
  }

  // Nếu trang hiện tại không ở trong thư mục "pages", thêm "pages/" vào đầu.
  return "pages/" + path;
}

document.addEventListener("DOMContentLoaded", async function () {
  // Initialize loading indicators
  initializeLoadingState();

  // Check authentication and update UI
  await checkAuthAndUpdateUI();

  // Initialize mobile menu
  initializeMobileMenu();

  // Handle search
  setupSearch();

  // Initialize auth modals
  setupAuthModals();

  // Handle page-specific content
  loadPageSpecificContent();

  // Initialize animations
  initAnimations();

  // Initialize lazy loading for images
  if (typeof imageUtils !== "undefined") {
    imageUtils.initLazyLoading();
  }
});

/**
 * Initialize loading state indicators
 */
function initializeLoadingState() {
  state.isLoading = true;
  const loaders = document.querySelectorAll(".loading-container");
  loaders.forEach((loader) => {
    loader.style.display = "flex";
  });
}

/**
 * Complete loading state
 */
function completeLoading() {
  state.isLoading = false;
  const loaders = document.querySelectorAll(".loading-container");
  loaders.forEach((loader) => {
    loader.style.display = "none";
  });
}

/**
 * Check authentication and update UI accordingly
 */
async function checkAuthAndUpdateUI() {
  try {
    // Kiểm tra xem có token hợp lệ không
    const isLoggedIn = apiService.auth.isAuthenticated();

    if (isLoggedIn) {
      state.isAuthenticated = true;
      state.currentUser = apiService.auth.getCurrentUser();

      // Cập nhật UI dựa trên trạng thái đăng nhập
      updateAuthenticatedUI(state.currentUser);

      // Hiển thị thông báo chào mừng cho người dùng quay lại
      const lastVisitTime = localStorage.getItem("lastVisitTime");
      const currentTime = new Date().getTime();

      if (!lastVisitTime || currentTime - lastVisitTime > 24 * 60 * 60 * 1000) {
        // Nếu lần đầu ghé thăm hoặc hơn 24 giờ kể từ lần cuối
        if (typeof notifications !== "undefined") {
          notifications.success(
            `Chào mừng trở lại, ${
              state.currentUser.displayName || state.currentUser.username
            }!`
          );
        }
      }

      // Cập nhật thời gian ghé thăm cuối
      localStorage.setItem("lastVisitTime", currentTime);
    } else {
      // Người dùng chưa đăng nhập
      updateUnauthenticatedUI();
    }
  } catch (error) {
    console.error("Lỗi khi kiểm tra trạng thái xác thực:", error);
    updateUnauthenticatedUI();
  }
}

/**
 * Update UI for authenticated users
 */
function updateAuthenticatedUI(user) {
  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  const navMenu = document.querySelector(".nav-menu");

  if (!loginBtn || !registerBtn || !navMenu) return;

  // Hide login/register buttons
  loginBtn.style.display = "none";
  registerBtn.style.display = "none";

  // Add user menu item
  const userMenuItem = document.createElement("li");
  userMenuItem.className = "user-menu-item";

  // Create user avatar/initial for the dropdown toggle
  const userInitial = user.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : user.username.charAt(0).toUpperCase();

  userMenuItem.innerHTML = `
    <div class="user-menu">
      <a href="#" class="user-menu-toggle">
        <div class="user-avatar">${userInitial}</div>
        <span>${user.displayName || user.username}</span>
        <i class="fas fa-chevron-down"></i>
      </a>
      <div class="user-dropdown">
        <a href="pages/profile.html"><i class="fas fa-user"></i> Hồ sơ</a>
        <a href="pages/profile.html#my-books"><i class="fas fa-book"></i> Sách của tôi</a>
        <a href="pages/profile.html#favorites"><i class="fas fa-heart"></i> Sách yêu thích</a>
        <a href="pages/profile.html#downloads"><i class="fas fa-download"></i> Lịch sử tải xuống</a>
        ${
          user.role === "admin"
            ? '<a href="pages/admin/dashboard.html"><i class="fas fa-cog"></i> Quản trị</a>'
            : ""
        }
        <a href="#" id="logout-btn"><i class="fas fa-sign-out-alt"></i> Đăng xuất</a>
      </div>
    </div>
  `;

  navMenu.appendChild(userMenuItem);

  // Style for user avatar
  const style = document.createElement("style");
  style.textContent = `
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: var(--primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-right: 8px;
    }
    
    .user-menu-toggle {
      display: flex;
      align-items: center;
    }
    
    .user-menu-toggle i {
      margin-left: 5px;
      font-size: 0.8rem;
      transition: transform 0.3s ease;
    }
    
    .user-menu:hover .user-menu-toggle i {
      transform: rotate(180deg);
    }
  `;
  document.head.appendChild(style);

  // Handle logout
  document.getElementById("logout-btn").addEventListener("click", function (e) {
    e.preventDefault();

    // Show confirmation
    if (confirm("Bạn có chắc muốn đăng xuất?")) {
      apiService.auth.logout();

      // Show logout notification
      if (typeof notifications !== "undefined") {
        notifications.info("Đăng xuất thành công!");
      }

      // Reload page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  });
}

/**
 * Update UI for unauthenticated users
 */
function updateUnauthenticatedUI() {
  state.isAuthenticated = false;
  state.currentUser = null;

  // Ensure login/register buttons are visible
  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");

  if (loginBtn) loginBtn.style.display = "block";
  if (registerBtn) registerBtn.style.display = "block";
}

/**
 * Initialize mobile menu
 */
function initializeMobileMenu() {
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const navMenu = document.getElementById("nav-menu");

  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener("click", function () {
      mobileMenuToggle.classList.toggle("active");
      navMenu.classList.toggle("active");
    });

    // Close menu when clicking outside
    document.addEventListener("click", function (event) {
      if (
        !event.target.closest(".nav-menu") &&
        !event.target.closest("#mobile-menu-toggle") &&
        navMenu.classList.contains("active")
      ) {
        navMenu.classList.remove("active");
        mobileMenuToggle.classList.remove("active");
      }
    });
  }
}

/**
 * Setup search functionality
 */
function setupSearch() {
  const searchBar = document.querySelector(".search-bar");
  const searchInput = document.getElementById("search-input");

  if (searchBar && searchInput) {
    searchBar.addEventListener("submit", function (e) {
      e.preventDefault();
      const searchQuery = searchInput.value.trim();

      if (searchQuery) {
        // Determine the correct path depending on current location
        const pagesPath = window.location.pathname.includes("/pages/")
          ? ""
          : "pages/";
        window.location.href = `${pagesPath}search-results.html?q=${encodeURIComponent(
          searchQuery
        )}`;
      }
    });

    // Add placeholder animation to search input
    const placeholders = [
      "Tìm kiếm sách...",
      "Tìm tác giả...",
      "Tìm theo danh mục...",
      "Khám phá kiến thức mới...",
    ];

    let currentPlaceholder = 0;
    const cyclePlaceholders = () => {
      if (!searchInput.value && !document.activeElement === searchInput) {
        currentPlaceholder = (currentPlaceholder + 1) % placeholders.length;
        searchInput.setAttribute(
          "placeholder",
          placeholders[currentPlaceholder]
        );
      }
    };

    // Change placeholder every 3 seconds
    setInterval(cyclePlaceholders, 3000);
  }
}

/**
 * Setup authentication modals (login/register)
 */
function setupAuthModals() {
  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");

  if (loginBtn) {
    loginBtn.addEventListener("click", function (e) {
      e.preventDefault();
      showAuthModal("login");
    });
  }

  if (registerBtn) {
    registerBtn.addEventListener("click", function (e) {
      e.preventDefault();
      showAuthModal("register");
    });
  }
}

/**
 * Show authentication modal
 */
function showAuthModal(type) {
  // Create modal if it doesn't exist
  if (!document.querySelector(".auth-modal")) {
    createAuthModal();
  }

  // Show modal and set active tab
  const modal = document.querySelector(".auth-modal");
  modal.classList.add("active");

  // Set active tab
  setActiveAuthTab(type);

  // Add escape key listener
  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") {
      closeAuthModal();
      document.removeEventListener("keydown", escHandler);
    }
  });
}

/**
 * Create authentication modal
 */
function createAuthModal() {
  const modalHTML = `
    <div class="auth-modal">
      <div class="auth-modal-backdrop"></div>
      <div class="auth-modal-content">
        <button class="auth-modal-close">&times;</button>
        
        <div class="auth-modal-header">
          <img src="assets/images/logo.png" alt="EBook Haven" class="auth-modal-logo">
          <h2 id="auth-modal-title">Đăng nhập</h2>
        </div>
        
        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login">Đăng nhập</button>
          <button class="auth-tab" data-tab="register">Đăng ký</button>
        </div>
        
        <div class="auth-forms">
          <form id="login-form" class="auth-form active">
            <div class="form-group">
              <label for="login-username">Tên đăng nhập hoặc Email</label>
              <div class="form-input-group">
                <i class="fas fa-user"></i>
                <input type="text" id="login-username" required>
              </div>
            </div>
            
            <div class="form-group">
              <label for="login-password">Mật khẩu</label>
              <div class="form-input-group">
                <i class="fas fa-lock"></i>
                <input type="password" id="login-password" required>
                <button type="button" class="password-toggle">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            
            <div class="form-group form-remember">
              <div class="checkbox-group">
                <input type="checkbox" id="remember-me">
                <label for="remember-me">Ghi nhớ đăng nhập</label>
              </div>
              <a href="#" class="forgot-password">Quên mật khẩu?</a>
            </div>
            
            <div class="form-group">
              <button type="submit" class="btn btn-primary btn-block">
                <i class="fas fa-sign-in-alt"></i> Đăng nhập
              </button>
            </div>
          </form>
          
          <form id="register-form" class="auth-form">
            <div class="form-group">
              <label for="register-username">Tên đăng nhập</label>
              <div class="form-input-group">
                <i class="fas fa-user"></i>
                <input type="text" id="register-username" required>
              </div>
            </div>
            
            <div class="form-group">
              <label for="register-email">Email</label>
              <div class="form-input-group">
                <i class="fas fa-envelope"></i>
                <input type="email" id="register-email" required>
              </div>
            </div>
            
            <div class="form-group">
              <label for="register-password">Mật khẩu</label>
              <div class="form-input-group">
                <i class="fas fa-lock"></i>
                <input type="password" id="register-password" required>
                <button type="button" class="password-toggle">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <label for="register-confirm-password">Xác nhận mật khẩu</label>
              <div class="form-input-group">
                <i class="fas fa-lock"></i>
                <input type="password" id="register-confirm-password" required>
                <button type="button" class="password-toggle">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <button type="submit" class="btn btn-primary btn-block">
                <i class="fas fa-user-plus"></i> Đăng ký
              </button>
            </div>
          </form>
        </div>
        
        <div class="auth-message" id="auth-message"></div>
        
        <div class="auth-divider">
          <span>Hoặc</span>
        </div>
        
        <div class="social-auth">
          <button class="btn btn-facebook">
            <i class="fab fa-facebook-f"></i> Facebook
          </button>
          <button class="btn btn-google">
            <i class="fab fa-google"></i> Google
          </button>
        </div>
      </div>
    </div>
  `;

  // Add modal to document
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Add CSS for auth modal
  const style = document.createElement("style");
  style.textContent = `
    .auth-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      display: none;
    }
    
    .auth-modal.active {
      display: flex;
      animation: fadeIn 0.3s forwards;
    }
    
    .auth-modal-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(2px);
    }
    
    .auth-modal-content {
      position: relative;
      width: 100%;
      max-width: 450px;
      margin: auto;
      background-color: white;
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      padding: 30px;
      transform: translateY(20px);
      opacity: 0;
      animation: slideIn 0.3s 0.1s forwards;
      z-index: 1;
    }
    
    .auth-modal-logo {
      height: 40px;
      margin-bottom: 15px;
    }
    
    .auth-modal-close {
      position: absolute;
      top: 15px;
      right: 15px;
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }
    
    .auth-modal-close:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }
    
    .auth-modal-header {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .auth-modal-header h2 {
      font-size: 1.8rem;
      color: var(--dark);
      margin: 0;
    }
    
    .auth-tabs {
      display: flex;
      margin-bottom: 25px;
      background-color: var(--light);
      border-radius: var(--radius);
      padding: 5px;
    }
    
    .auth-tab {
      flex: 1;
      padding: 10px;
      text-align: center;
      background: none;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.3s;
      font-weight: 500;
    }
    
    .auth-tab.active {
      background-color: white;
      box-shadow: var(--shadow-sm);
      color: var(--primary);
    }
    
    .auth-form {
      display: none;
    }
    
    .auth-form.active {
      display: block;
    }
    
    .form-input-group {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .form-input-group i {
      position: absolute;
      left: 12px;
      color: var(--gray);
      font-size: 1rem;
    }
    
    .form-input-group input {
      padding-left: 40px;
    }
    
    .password-toggle {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      color: var(--gray);
      cursor: pointer;
    }
    
    .form-remember {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .checkbox-group {
      display: flex;
      align-items: center;
    }
    
    .checkbox-group input {
      margin-right: 8px;
    }
    
    .forgot-password {
      color: var(--primary);
      font-size: 0.9rem;
    }
    
    .btn-block {
      width: 100%;
    }
    
    .auth-message {
      padding: 10px;
      margin: 15px 0;
      border-radius: var(--radius-sm);
      text-align: center;
      font-weight: 500;
      display: none;
    }
    
    .auth-message.success {
      background-color: rgba(6, 214, 160, 0.1);
      color: var(--success);
      display: block;
    }
    
    .auth-message.error {
      background-color: rgba(239, 71, 111, 0.1);
      color: var(--danger);
      display: block;
    }
    
    .auth-divider {
      display: flex;
      align-items: center;
      margin: 20px 0;
      color: var(--gray);
    }
    
    .auth-divider::before,
    .auth-divider::after {
      content: "";
      flex: 1;
      height: 1px;
      background-color: var(--light-gray);
    }
    
    .auth-divider span {
      padding: 0 15px;
    }
    
    .social-auth {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    
    .btn-facebook {
      background-color: #3b5998;
      color: white;
    }
    
    .btn-google {
      background-color: #db4437;
      color: white;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Setup event listeners
  setupAuthModalEvents();
}

/**
 * Setup auth modal events
 */
function setupAuthModalEvents() {
  const modal = document.querySelector(".auth-modal");
  const backdrop = document.querySelector(".auth-modal-backdrop");
  const closeBtn = document.querySelector(".auth-modal-close");
  const tabs = document.querySelectorAll(".auth-tab");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const passwordToggles = document.querySelectorAll(".password-toggle");

  // Close modal on backdrop click
  backdrop.addEventListener("click", closeAuthModal);

  // Close modal on close button click
  closeBtn.addEventListener("click", closeAuthModal);

  // Tab switching
  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      setActiveAuthTab(this.dataset.tab);
    });
  });

  // Password visibility toggle
  passwordToggles.forEach((toggle) => {
    toggle.addEventListener("click", function () {
      const passwordInput = this.previousElementSibling;
      const type = passwordInput.getAttribute("type");

      passwordInput.setAttribute(
        "type",
        type === "password" ? "text" : "password"
      );
      this.innerHTML =
        type === "password"
          ? '<i class="fas fa-eye-slash"></i>'
          : '<i class="fas fa-eye"></i>';
    });
  });

  // Login form submission
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    const rememberMe = document.getElementById("remember-me").checked;

    // Validate inputs
    if (!username || !password) {
      showAuthMessage("Vui lòng nhập đầy đủ thông tin!", "error");
      return;
    }

    try {
      // Show loading state
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
      submitBtn.disabled = true;

      // Call API
      const response = await apiService.auth.login({ username, password });

      // Handle success
      if (response.accessToken) {
        // Store authentication status
        apiService.auth.setUser(response);

        // Show success message
        showAuthMessage("Đăng nhập thành công!", "success");

        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem("remember", true);
        } else {
          localStorage.removeItem("remember");
        }

        // Reload page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // Show error message
        showAuthMessage(response.message || "Đăng nhập thất bại!", "error");

        // Reset button
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    } catch (error) {
      showAuthMessage("Lỗi kết nối server!", "error");
      console.error("Login error:", error);

      // Reset button
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
    }
  });

  // Register form submission
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("register-username").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById(
      "register-confirm-password"
    ).value;

    // Validate inputs
    if (!username || !email || !password || !confirmPassword) {
      showAuthMessage("Vui lòng nhập đầy đủ thông tin!", "error");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAuthMessage("Email không hợp lệ!", "error");
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      showAuthMessage("Mật khẩu xác nhận không khớp!", "error");
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      showAuthMessage("Mật khẩu phải có ít nhất 6 ký tự!", "error");
      return;
    }

    try {
      // Show loading state
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
      submitBtn.disabled = true;

      // Call API
      const response = await apiService.auth.register({
        username,
        email,
        password,
      });

      // Handle response
      if (response.message && !response.error) {
        // Show success message
        showAuthMessage(
          "Đăng ký thành công! Bạn có thể đăng nhập ngay.",
          "success"
        );

        // Switch to login tab after a delay
        setTimeout(() => {
          setActiveAuthTab("login");

          // Pre-fill login form
          document.getElementById("login-username").value = username;
        }, 2000);
      } else {
        // Show error message
        showAuthMessage(response.message || "Đăng ký thất bại!", "error");

        // Reset button
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    } catch (error) {
      showAuthMessage("Lỗi kết nối server!", "error");
      console.error("Register error:", error);

      // Reset button
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
    }
  });

  // Fake social auth (just a demo)
  const socialButtons = document.querySelectorAll(".social-auth .btn");
  socialButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      showAuthMessage(
        "Tính năng đăng nhập qua mạng xã hội đang được phát triển!",
        "error"
      );
    });
  });
}

/**
 * Set active authentication tab
 */
function setActiveAuthTab(tabName) {
  // Update tab buttons
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  // Update form visibility
  document.querySelectorAll(".auth-form").forEach((form) => {
    form.classList.toggle("active", form.id === `${tabName}-form`);
  });

  // Update modal title
  const modalTitle = document.getElementById("auth-modal-title");
  if (modalTitle) {
    modalTitle.textContent = tabName === "login" ? "Đăng nhập" : "Đăng ký";
  }

  // Clear any messages
  const messageEl = document.getElementById("auth-message");
  if (messageEl) {
    messageEl.className = "auth-message";
    messageEl.textContent = "";
  }
}

/**
 * Show authentication message
 */
function showAuthMessage(message, type) {
  const messageEl = document.getElementById("auth-message");
  if (messageEl) {
    messageEl.textContent = message;
    messageEl.className = `auth-message ${type}`;
  }
}

/**
 * Close authentication modal
 */
function closeAuthModal() {
  const modal = document.querySelector(".auth-modal");
  if (modal) {
    modal.classList.remove("active");
  }
}

/**
 * Load page-specific content
 */
function loadPageSpecificContent() {
  // Check if we're on the home page
  if (document.getElementById("home-page")) {
    loadHomePage();
  }

  // Check for book detail page
  const urlParams = new URLSearchParams(window.location.search);
  if (
    urlParams.has("id") &&
    window.location.href.includes("book-detail.html")
  ) {
    loadBookDetail(urlParams.get("id"));
  }

  // Check for search results page
  if (
    urlParams.has("q") &&
    window.location.href.includes("search-results.html")
  ) {
    loadSearchResults(urlParams.get("q"));
  }

  // Check for category page
  if (urlParams.has("id") && window.location.href.includes("categories.html")) {
    loadCategoryPage(urlParams.get("id"));
  }
}

/**
 * Load homepage content
 */
async function loadHomePage() {
  try {
    // Load categories
    const categories = await apiService.categories.getAll();
    state.categories = categories;

    const categoryGrid = document.querySelector(".category-grid");
    if (categoryGrid) {
      renderCategories(categories, categoryGrid);
    }

    // Load featured books
    try {
      const featuredBooks = await apiService.books.getFeatured();
      state.featuredBooks = featuredBooks;

      const featuredBooksGrid = document.querySelector(
        ".featured-books .book-grid"
      );
      if (featuredBooksGrid) {
        renderBooks(featuredBooks, featuredBooksGrid);
      }
    } catch (error) {
      console.error("Error loading featured books:", error);
      const featuredSection = document.querySelector(".featured-books");
      if (featuredSection) {
        featuredSection.innerHTML = `
          <h2 class="section-title">Sách nổi bật</h2>
          <div class="error-message">
            <p>Không thể tải sách nổi bật. Vui lòng thử lại sau.</p>
          </div>
        `;
      }
    }

    // Load new books
    try {
      const newBooks = await apiService.books.getLatest();
      state.newBooks = newBooks;

      const newBooksGrid = document.querySelector(".new-arrivals .book-grid");
      if (newBooksGrid) {
        renderBooks(newBooks, newBooksGrid);
      }
    } catch (error) {
      console.error("Error loading new books:", error);
      const newBooksSection = document.querySelector(".new-arrivals");
      if (newBooksSection) {
        newBooksSection.innerHTML = `
          <h2 class="section-title">Sách mới</h2>
          <div class="error-message">
            <p>Không thể tải sách mới. Vui lòng thử lại sau.</p>
          </div>
        `;
      }
    }

    // Complete loading
    completeLoading();
  } catch (error) {
    console.error("Error loading homepage:", error);
    completeLoading();
  }
}

/**
 * Render categories
 */
function renderCategories(categories, container) {
  if (!container) return;

  container.innerHTML = "";

  // Create grid-based layout
  categories.forEach((category) => {
    const categoryEl = document.createElement("div");
    categoryEl.className = "category-card animate-item";

    // Get an icon based on category name - simple mapping
    const iconMap = {
      "Văn học": "book",
      "Kinh tế": "chart-line",
      "Khoa học": "flask",
      "Công nghệ": "laptop-code",
      "Lịch sử": "landmark",
      "Tâm lý": "brain",
      "Nghệ thuật": "palette",
      "Y học": "heartbeat",
      "Giáo dục": "graduation-cap",
    };

    // Get icon or use default
    const icon = iconMap[category.name] || "book";

    categoryEl.innerHTML = `
      <div class="category-icon">
        <i class="fas fa-${icon}"></i>
      </div>
      <h3>${category.name}</h3>
      <p><span class="book-count">${
        category.bookCount || 0
      }</span> cuốn sách</p>
    `;

    // Add click event
    categoryEl.addEventListener("click", () => {
      // Determine the correct path
      const pagesPath = window.location.pathname.includes("/pages/")
        ? ""
        : "pages/";
      window.location.href = `${pagesPath}categories.html?id=${category.id}`;
    });

    container.appendChild(categoryEl);
  });
}

/**
 * Render books
 */
function renderBooks(books, container) {
  if (!container) return;

  container.innerHTML = "";

  if (!books || books.length === 0) {
    container.innerHTML = `
      <div class="no-books-message">
        <p>Không có sách nào được tìm thấy.</p>
      </div>
    `;
    return;
  }

  books.forEach((book, index) => {
    // Process cover path
    let coverPath = imageUtils
      ? imageUtils.processImagePath(book.coverPath)
      : book.coverPath || "/api/placeholder/220/250";

    // Create book card
    const bookCard = document.createElement("div");
    bookCard.className = "book-card animate-item";
    bookCard.setAttribute("data-index", index);

    // Check if book is new (less than 7 days old)
    const isNew =
      new Date(book.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Add featured/new badge if applicable
    let badgeHTML = "";
    if (book.featured) {
      badgeHTML = `<div class="book-badge featured">Nổi bật</div>`;
    } else if (isNew) {
      badgeHTML = `<div class="book-badge new">Mới</div>`;
    }

    bookCard.innerHTML = `
      <div class="book-cover">
        <img src="${coverPath}" 
             alt="${book.title}" 
             onerror="this.onerror=null; this.src='/api/placeholder/220/250';"
             loading="lazy">
        ${badgeHTML}
      </div>
      <div class="book-info">
        <div class="book-category">${
          book.category?.name || "Không phân loại"
        }</div>
        <h3 class="book-title">${book.title}</h3>
        <div class="book-author">${book.author}</div>
        <div class="book-stats">
          <span><i class="fas fa-star"></i> ${book.rating || "0"}</span>
          <span><i class="fas fa-download"></i> ${
            book.downloadCount || "0"
          }</span>
        </div>
      </div>
    `;

    // Add click event to navigate to book detail
    bookCard.addEventListener("click", () => {
      // Determine the correct path
      const pagesPath = window.location.pathname.includes("/pages/")
        ? ""
        : "pages/";
      window.location.href = `${pagesPath}book-detail.html?id=${book.id}`;
    });

    container.appendChild(bookCard);
  });
}

/**
 * Load book detail
 */
async function loadBookDetail(bookId) {
  try {
    const book = await apiService.books.getById(bookId);

    if (!book || !book.id) {
      throw new Error("Không tìm thấy dữ liệu sách");
    }

    // Cập nhật tiêu đề trang
    document.title = `${book.title} - EBook Haven`;

    // Tìm container thông tin sách
    const bookInfoContainer = document.getElementById("book-info");
    if (bookInfoContainer) {
      renderBookDetail(book, bookInfoContainer);
    }

    // Tải bình luận
    loadBookComments(bookId);

    // Tải sách liên quan
    if (book.categoryId) {
      loadRelatedBooks(book.categoryId, book.id);
    }

    // Cập nhật hiển thị phần đánh giá
    updateRatingSectionVisibility();

    // Hoàn thành tải
    completeLoading();
  } catch (error) {
    console.error("Lỗi khi tải chi tiết sách:", error);

    // Hiển thị thông báo lỗi
    const bookInfoContainer = document.getElementById("book-info");
    if (bookInfoContainer) {
      bookInfoContainer.innerHTML = `
        <div class="error-message">
          <h2>Không thể tải thông tin sách</h2>
          <p>Đã xảy ra lỗi: ${error.message}</p>
          <a href="javascript:history.back()" class="btn btn-primary">
            <i class="fas fa-arrow-left"></i> Quay lại
          </a>
        </div>
      `;
    }

    completeLoading();
  }
}

/**
 * Render book detail
 */
function renderBookDetail(book, container) {
  // Process cover path
  let coverPath = imageUtils
    ? imageUtils.processImagePath(book.coverPath)
    : book.coverPath || "/api/placeholder/300/450";

  // Check if book is new (less than 7 days old)
  const isNew =
    new Date(book.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Create HTML
  container.innerHTML = `
    <div class="book-detail-image">
      <img src="${coverPath}" 
           alt="${book.title}" 
           onerror="this.onerror=null; this.src='/api/placeholder/300/450';">
      ${
        book.featured
          ? '<span class="book-label book-featured"><i class="fas fa-award"></i> Nổi bật</span>'
          : ""
      }
      ${
        isNew
          ? '<span class="book-label book-new"><i class="fas fa-certificate"></i> Mới</span>'
          : ""
      }
    </div>
    <div class="book-detail-info">
      <h1 class="book-detail-title">${book.title}</h1>
      <div class="book-detail-author"><i class="fas fa-user-edit"></i> Tác giả: ${
        book.author
      }</div>
      
      <div class="book-detail-meta">
        <div><i class="fas fa-folder"></i> ${
          book.category ? book.category.name : "Không phân loại"
        }</div>
        ${
          book.pageCount
            ? `<div><i class="fas fa-file-alt"></i> ${book.pageCount} trang</div>`
            : ""
        }
        <div><i class="fas fa-star"></i> ${book.rating || "0"}/5 (${
    book.ratingCount || "0"
  } đánh giá)</div>
        <div><i class="fas fa-download"></i> ${
          book.downloadCount || "0"
        } lượt tải</div>
        ${
          book.language
            ? `<div><i class="fas fa-language"></i> ${book.language}</div>`
            : ""
        }
        ${
          book.publishYear
            ? `<div><i class="fas fa-calendar-alt"></i> ${book.publishYear}</div>`
            : ""
        }
      </div>
      
      <div class="book-stats-detailed">
        <div class="book-stat">
          <div class="book-stat-value">${book.rating || "0"}</div>
          <div class="book-stat-label">Đánh giá</div>
        </div>
        <div class="book-stat">
          <div class="book-stat-value">${book.downloadCount || "0"}</div>
          <div class="book-stat-label">Lượt tải</div>
        </div>
        <div class="book-stat">
          <div class="book-stat-value">${book.viewCount || "0"}</div>
          <div class="book-stat-label">Lượt xem</div>
        </div>
      </div>
      
      <div class="book-detail-description">
        <h3><i class="fas fa-info-circle"></i> Giới thiệu sách</h3>
        <div class="book-description-content">${
          formatDescription(book.description) || "Không có mô tả."
        }</div>
      </div>
      
      <div class="book-detail-actions">
        <button class="btn btn-primary" id="download-btn">
          <i class="fas fa-download"></i> Tải xuống
        </button>
        <button class="btn btn-secondary" id="favorite-btn">
          <i class="far fa-heart"></i> Thêm vào yêu thích
        </button>
        <button class="btn btn-outline share-btn" id="share-btn">
          <i class="fas fa-share-alt"></i> Chia sẻ
        </button>
      </div>
      
      ${
        book.uploader
          ? `
        <div class="book-uploader">
          <p><i class="fas fa-user-circle"></i> Đăng tải bởi: ${
            book.uploader.username
          } (${new Date(book.createdAt).toLocaleDateString()})</p>
        </div>
      `
          : ""
      }
    </div>
  `;

  // Add event listeners
  document.getElementById("download-btn").addEventListener("click", () => {
    downloadBook(book.id);
  });

  const favoriteBtn = document.getElementById("favorite-btn");
  updateFavoriteButton(favoriteBtn, book.id);

  // Share button
  document.getElementById("share-btn").addEventListener("click", () => {
    shareBook(book);
  });
}

/**
 * Format book description with paragraphs and links
 */
function formatDescription(description) {
  if (!description) return "";

  // Convert line breaks to paragraphs
  const paragraphs = description.split("\n\n").filter((p) => p.trim());

  // Process each paragraph
  const processedParagraphs = paragraphs.map((paragraph) => {
    // Convert URLs to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return paragraph.replace(
      urlRegex,
      (url) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    );
  });

  // Join paragraphs with proper HTML
  return processedParagraphs.map((p) => `<p>${p}</p>`).join("");
}

/**
 * Update favorite button state
 */
async function updateFavoriteButton(button, bookId) {
  if (!state.isAuthenticated) {
    // Not logged in, keep default state
    button.innerHTML = '<i class="far fa-heart"></i> Thêm vào yêu thích';
    button.onclick = () => {
      showAuthModal("login");
    };
    return;
  }

  try {
    // Check if book is in favorites
    const favorites = await apiService.users.getFavoriteBooks();
    const isFavorite = favorites.some((fav) => fav.id === parseInt(bookId));

    if (isFavorite) {
      button.innerHTML = '<i class="fas fa-heart"></i> Xóa khỏi yêu thích';
      button.className = "btn btn-danger";
      button.onclick = () => removeFromFavorites(bookId);
    } else {
      button.innerHTML = '<i class="far fa-heart"></i> Thêm vào yêu thích';
      button.className = "btn btn-secondary";
      button.onclick = () => addToFavorites(bookId);
    }
  } catch (error) {
    console.error("Error checking favorite status:", error);

    // Default state on error
    button.innerHTML = '<i class="far fa-heart"></i> Thêm vào yêu thích';
    button.onclick = () => addToFavorites(bookId);
  }
}

/**
 * Add book to favorites
 */
async function addToFavorites(bookId) {
  if (!state.isAuthenticated) {
    showAuthModal("login");
    return;
  }

  try {
    const response = await apiService.users.addToFavorites(bookId);

    if (response.success || response.message) {
      // Show success notification
      if (typeof notifications !== "undefined") {
        notifications.success(
          response.message || "Đã thêm sách vào danh sách yêu thích!"
        );
      }

      // Update button state
      const favoriteBtn = document.getElementById("favorite-btn");
      if (favoriteBtn) {
        updateFavoriteButton(favoriteBtn, bookId);
      }
    } else {
      // Show error notification
      if (typeof notifications !== "undefined") {
        notifications.error(
          response.message || "Có lỗi xảy ra khi thêm vào yêu thích"
        );
      }
    }
  } catch (error) {
    console.error("Error adding to favorites:", error);

    // Show error notification
    if (typeof notifications !== "undefined") {
      notifications.error(
        "Có lỗi xảy ra khi thêm vào yêu thích: " +
          (error.message || "Lỗi không xác định")
      );
    }
  }
}

/**
 * Remove book from favorites
 */
async function removeFromFavorites(bookId) {
  if (!state.isAuthenticated) {
    showAuthModal("login");
    return;
  }

  try {
    const response = await apiService.users.removeFromFavorites(bookId);

    if (response.success || response.message) {
      // Show success notification
      if (typeof notifications !== "undefined") {
        notifications.success(
          response.message || "Đã xóa sách khỏi danh sách yêu thích!"
        );
      }

      // Update button state
      const favoriteBtn = document.getElementById("favorite-btn");
      if (favoriteBtn) {
        updateFavoriteButton(favoriteBtn, bookId);
      }
    } else {
      // Show error notification
      if (typeof notifications !== "undefined") {
        notifications.error(
          response.message || "Có lỗi xảy ra khi xóa khỏi yêu thích"
        );
      }
    }
  } catch (error) {
    console.error("Error removing from favorites:", error);

    // Show error notification
    if (typeof notifications !== "undefined") {
      notifications.error(
        "Có lỗi xảy ra khi xóa khỏi yêu thích: " +
          (error.message || "Lỗi không xác định")
      );
    }
  }
}

/**
 * Download book
 */
// Sửa hàm downloadBook() trong file main.js
function downloadBook(bookId) {
  if (!state.isAuthenticated) {
    showAuthModal("login");
    if (typeof notifications !== "undefined") {
      notifications.info("Vui lòng đăng nhập để tải sách");
    }
    return;
  }

  apiService.books.download(bookId);
  if (typeof notifications !== "undefined") {
    notifications.success("Đang tải xuống sách...");
  }
}

/**
 * Share book
 */
function shareBook(book) {
  // Check if Web Share API is supported
  if (navigator.share) {
    navigator
      .share({
        title: book.title,
        text: `Khám phá cuốn sách "${book.title}" của tác giả ${book.author} trên EBook Haven`,
        url: window.location.href,
      })
      .then(() => {
        console.log("Book shared successfully");
      })
      .catch((error) => {
        console.error("Error sharing book:", error);

        // Fallback to copy link method
        copyShareLink();
      });
  } else {
    // Fallback for browsers that don't support the Web Share API
    copyShareLink();
  }
}

/**
 * Copy share link to clipboard
 */
function copyShareLink() {
  const dummy = document.createElement("input");
  document.body.appendChild(dummy);
  dummy.value = window.location.href;
  dummy.select();
  document.execCommand("copy");
  document.body.removeChild(dummy);

  // Show notification
  if (typeof notifications !== "undefined") {
    notifications.success("Đã sao chép liên kết vào clipboard!");
  }
}

/**
 * Update rating section visibility
 */
function updateRatingSectionVisibility() {
  const ratingSection = document.getElementById("rating-section");

  if (ratingSection) {
    if (state.isAuthenticated) {
      ratingSection.style.display = "block";
      setupRatingStars();
    } else {
      ratingSection.style.display = "none";
    }
  }
}

/**
 * Setup rating stars
 */
function setupRatingStars() {
  let currentRating = 0;
  const stars = document.querySelectorAll("#star-rating i");

  if (!stars.length) return;

  stars.forEach((star) => {
    // Hover effect
    star.addEventListener("mouseover", function () {
      const rating = parseInt(this.dataset.rating);
      highlightStars(rating);
    });

    star.addEventListener("mouseout", function () {
      highlightStars(currentRating);
    });

    // Click to set rating
    star.addEventListener("click", function () {
      currentRating = parseInt(this.dataset.rating);
      highlightStars(currentRating);
    });
  });

  // Handle submit rating
  const submitBtn = document.getElementById("submit-rating");
  if (submitBtn) {
    submitBtn.addEventListener("click", async function () {
      if (currentRating === 0) {
        // Show warning notification
        if (typeof notifications !== "undefined") {
          notifications.warning("Vui lòng chọn số sao đánh giá!");
        }
        return;
      }

      // Get book ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const bookId = urlParams.get("id");

      if (!bookId) return;

      try {
        // Get comment
        const comment = document.getElementById("comment").value;

        // Submit rating
        await apiService.books.rate(bookId, currentRating, comment);

        // Show success notification
        if (typeof notifications !== "undefined") {
          notifications.success("Đã gửi đánh giá thành công!");
        }

        // Reload page after delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        console.error("Error rating book:", error);

        // Show error notification
        if (typeof notifications !== "undefined") {
          notifications.error(
            "Lỗi khi gửi đánh giá: " + (error.message || "Lỗi không xác định")
          );
        }
      }
    });
  }

  // Helper function to highlight stars
  function highlightStars(rating) {
    stars.forEach((star) => {
      const starRating = parseInt(star.dataset.rating);

      if (starRating <= rating) {
        star.className = "fas fa-star";
      } else {
        star.className = "far fa-star";
      }
    });
  }
}

/**
 * Load book comments
 */
async function loadBookComments(bookId) {
  try {
    const comments = await apiService.books.getComments(bookId);

    const commentsSection = document.getElementById("comments-section");
    const commentsContainer = document.getElementById("comments-container");

    if (!commentsSection || !commentsContainer) return;

    if (comments && comments.length > 0) {
      commentsSection.style.display = "block";
      renderComments(comments, commentsContainer);
    } else {
      commentsSection.style.display = "none";
    }
  } catch (error) {
    console.error("Error loading comments:", error);

    // Hide comments section on error
    const commentsSection = document.getElementById("comments-section");
    if (commentsSection) {
      commentsSection.style.display = "none";
    }
  }
}

/**
 * Render comments
 */
function renderComments(comments, container) {
  container.innerHTML = "";

  comments.forEach((comment) => {
    // Format date
    const date = new Date(comment.createdAt);
    const formattedDate = date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Create star rating HTML
    let starsHTML = "";
    for (let i = 1; i <= 5; i++) {
      if (i <= comment.rating) {
        starsHTML += '<i class="fas fa-star"></i>';
      } else {
        starsHTML += '<i class="far fa-star"></i>';
      }
    }

    // Create comment element
    const commentEl = document.createElement("div");
    commentEl.className = "comment animate-fadeIn";

    commentEl.innerHTML = `
      <div class="comment-header">
        <div class="comment-user">${
          comment.user.displayName || comment.user.username
        }</div>
        <div class="comment-date">${formattedDate}</div>
      </div>
      <div class="comment-rating">${starsHTML}</div>
      <div class="comment-content">${comment.comment}</div>
    `;

    container.appendChild(commentEl);
  });
}

/**
 * Load related books
 */
async function loadRelatedBooks(categoryId, currentBookId) {
  try {
    const relatedBooks = await apiService.categories.getBooks(categoryId);

    // Remove current book and limit to 4 books
    const filteredBooks = relatedBooks
      .filter((book) => book.id !== parseInt(currentBookId))
      .slice(0, 4);

    const relatedBooksContainer = document.getElementById("related-books");

    if (!relatedBooksContainer) return;

    if (filteredBooks.length > 0) {
      renderBooks(filteredBooks, relatedBooksContainer);
    } else {
      // Hide related books section if no books
      const relatedBooksSection = document.querySelector(".related-books");
      if (relatedBooksSection) {
        relatedBooksSection.style.display = "none";
      }
    }
  } catch (error) {
    console.error("Error loading related books:", error);

    // Hide related books section on error
    const relatedBooksSection = document.querySelector(".related-books");
    if (relatedBooksSection) {
      relatedBooksSection.style.display = "none";
    }
  }
}

/**
 * Initialize animations
 */
function initAnimations() {
  // Fade in animations for home page
  const animateItems = document.querySelectorAll(
    ".animate-fadeIn, .animate-slideUp"
  );

  if (animateItems.length) {
    // Add intersection observer for animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    animateItems.forEach((item) => {
      observer.observe(item);
    });

    // Add animation classes
    const style = document.createElement("style");
    style.textContent = `
      .animate-fadeIn {
        opacity: 0;
        transition: opacity 0.6s ease;
      }
      
      .animate-slideUp {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
      }
      
      .animate-visible.animate-fadeIn {
        opacity: 1;
      }
      
      .animate-visible.animate-slideUp {
        opacity: 1;
        transform: translateY(0);
      }
      
      .animate-item {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.5s ease, transform 0.5s ease;
      }
      
      .animate-visible.animate-item {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Load search results page
 */
async function loadSearchResults(query) {
  // Update page title and search query display
  document.title = `Kết quả tìm kiếm: ${query} - EBook Haven`;

  const searchTermEl = document.getElementById("search-term");
  if (searchTermEl) {
    searchTermEl.textContent = query;
  }

  // Pre-fill search input
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.value = query;
  }

  try {
    // Load search results
    const params = { title: query };

    // Get filter values if they exist
    const categoryFilter = document.getElementById("category-filter");
    const sortFilter = document.getElementById("sort-filter");

    if (categoryFilter && categoryFilter.value) {
      params.category = categoryFilter.value;
    }

    if (sortFilter && sortFilter.value) {
      params.sort = sortFilter.value;
    }

    const results = await apiService.books.getAll(params);

    // Update result count
    const searchCountEl = document.getElementById("search-count");
    if (searchCountEl) {
      searchCountEl.innerHTML = `Tìm thấy <span>${results.length}</span> kết quả`;
    }

    // Render results
    const resultsContainer = document.querySelector(".search-results");
    const emptyMessage = document.querySelector(".search-empty");

    if (resultsContainer && emptyMessage) {
      if (results.length > 0) {
        resultsContainer.style.display = "grid";
        emptyMessage.style.display = "none";
        renderBooks(results, resultsContainer);
      } else {
        resultsContainer.style.display = "none";
        emptyMessage.style.display = "block";
      }
    }

    // Complete loading
    completeLoading();
  } catch (error) {
    console.error("Error loading search results:", error);

    // Show error message
    const resultsContainer = document.querySelector(".search-results");
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="error-message">
          <h2>Lỗi tìm kiếm</h2>
          <p>Đã xảy ra lỗi khi tìm kiếm. Vui lòng thử lại sau.</p>
        </div>
      `;
    }

    completeLoading();
  }
}

/**
 * Load category page
 */
async function loadCategoryPage(categoryId) {
  try {
    // Load category details
    const category = await apiService.categories.getById(categoryId);

    // Update page title
    if (category) {
      document.title = `${category.name} - EBook Haven`;

      // Update category title
      const categoryTitleEl = document.getElementById("category-title");
      if (categoryTitleEl) {
        categoryTitleEl.textContent = category.name;
      }

      // Set active category in the list
      const categoryItems = document.querySelectorAll(".category-item");
      categoryItems.forEach((item) => {
        item.classList.remove("active");
        if (item.dataset.id === categoryId) {
          item.classList.add("active");
        }
      });
    }

    // Load books in this category
    const books = await apiService.categories.getBooks(categoryId);

    // Render books
    const booksGrid = document.getElementById("category-books-grid");
    const noBooks = document.getElementById("no-books");

    if (booksGrid && noBooks) {
      if (books && books.length > 0) {
        booksGrid.style.display = "grid";
        noBooks.style.display = "none";
        renderBooks(books, booksGrid);
      } else {
        booksGrid.style.display = "none";
        noBooks.style.display = "block";
      }
    }

    // Complete loading
    completeLoading();
  } catch (error) {
    console.error("Error loading category page:", error);

    // Show error message
    const booksGrid = document.getElementById("category-books-grid");
    if (booksGrid) {
      booksGrid.innerHTML = `
        <div class="error-message">
          <h2>Lỗi tải danh mục</h2>
          <p>Đã xảy ra lỗi khi tải danh mục. Vui lòng thử lại sau.</p>
        </div>
      `;
    }

    completeLoading();
  }
}
