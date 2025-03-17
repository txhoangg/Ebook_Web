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
    console.log("Trang chủ được phát hiện, đang tải nội dung...");
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
    console.log("Đang tải trang chủ...");

    // Load categories
    const categories = await apiService.categories.getAll();
    console.log("Danh mục đã tải:", categories);
    state.categories = categories;

    const categoryGrid = document.querySelector(".category-grid");
    if (categoryGrid) {
      console.log("Đã tìm thấy phần tử .category-grid");

      // Kiểm tra mảng categories
      if (!categories || categories.length === 0) {
        console.log("Không có danh mục nào để hiển thị");
        categoryGrid.innerHTML = "<p>Không có danh mục nào.</p>";
      } else {
        console.log("Có " + categories.length + " danh mục, đang render...");
        renderCategories(categories, categoryGrid);
      }
    } else {
      console.error("Không tìm thấy phần tử .category-grid");
    }

    // Load featured books
    try {
      console.log("Đang tải sách nổi bật...");
      const featuredBooks = await apiService.books.getFeatured();
      console.log("Sách nổi bật đã tải:", featuredBooks);
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
      console.log("Đang tải sách mới...");
      const newBooks = await apiService.books.getLatest();
      console.log("Sách mới đã tải:", newBooks);
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
  console.log("Đang render danh mục:", categories);
  if (!container) {
    console.error("Container không tồn tại!");
    return;
  }

  container.innerHTML = "";

  // Kiểm tra lại mảng categories
  if (!categories || categories.length === 0) {
    console.log("Không có danh mục để hiển thị");
    container.innerHTML = "<p>Không có danh mục nào để hiển thị.</p>";
    return;
  }

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

// Thêm sự kiện onload để đảm bảo DOM đã sẵn sàng
window.addEventListener("load", function () {
  // Kiểm tra lại nếu đang ở trang chủ
  if (document.getElementById("home-page")) {
    console.log("DOM đã load hoàn tất, kiểm tra lại việc tải trang chủ...");

    const categoryGrid = document.querySelector(".category-grid");
    if (categoryGrid && (!state.categories || state.categories.length === 0)) {
      console.log("Tải lại danh mục...");
      loadHomePage();
    }
  }
});
