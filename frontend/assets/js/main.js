const state = {
  isAuthenticated: false,
  currentUser: null,
  categories: [],
  featuredBooks: [],
  newBooks: [],
  isLoading: false,
};

function getCorrectPath(path) {
  // Sử dụng hàm từ path-helper.js nếu có
  if (typeof paths !== "undefined") {
    return paths.toPage(path);
  }

  // Fallback nếu path-helper.js không được tải
  if (path.startsWith("/")) {
    return path;
  }

  // Xóa phần kiểm tra và thêm tiền tố /pages/
  if (path.endsWith(".html") && !path.includes("/")) {
    return "/" + path; // Thay đổi từ "/pages/" + path thành "/" + path
  }

  return "/" + path;
}

document.addEventListener("DOMContentLoaded", async function () {
  initializeLoadingState();

  await checkAuthAndUpdateUI();

  initializeMobileMenu();

  setupSearch();

  setupAuthModals();

  loadPageSpecificContent();

  initAnimations();

  if (typeof imageUtils !== "undefined") {
    imageUtils.initLazyLoading();
  }
});

function initAnimations() {
  const animateItems = document.querySelectorAll(".animate-item");

  if (animateItems.length > 0) {
    animateItems.forEach((item, index) => {
      item.style.opacity = "0";
      item.style.transform = "translateY(20px)";
      item.style.transition = "opacity 0.3s ease, transform 0.3s ease";

      setTimeout(() => {
        item.style.opacity = "1";
        item.style.transform = "translateY(0)";
      }, 100 * index);
    });
  }
}

function initializeLoadingState() {
  state.isLoading = true;
  const loaders = document.querySelectorAll(".loading-container");
  loaders.forEach((loader) => {
    loader.style.display = "flex";
  });
}

function completeLoading() {
  state.isLoading = false;
  const loaders = document.querySelectorAll(".loading-container");
  loaders.forEach((loader) => {
    loader.style.display = "none";
  });
}

async function checkAuthAndUpdateUI() {
  try {
    const isLoggedIn = apiService.auth.isAuthenticated();

    if (isLoggedIn) {
      state.isAuthenticated = true;
      state.currentUser = apiService.auth.getCurrentUser();

      updateAuthenticatedUI(state.currentUser);

      const lastVisitTime = localStorage.getItem("lastVisitTime");
      const currentTime = new Date().getTime();

      if (!lastVisitTime || currentTime - lastVisitTime > 24 * 60 * 60 * 1000) {
        if (typeof notifications !== "undefined") {
          notifications.success(
            `Chào mừng trở lại, ${
              state.currentUser.displayName || state.currentUser.username
            }!`
          );
        }
      }

      localStorage.setItem("lastVisitTime", currentTime);
    } else {
      updateUnauthenticatedUI();
    }
  } catch (error) {
    console.error("Lỗi khi kiểm tra trạng thái xác thực:", error);
    updateUnauthenticatedUI();
  }
}

function updateAuthenticatedUI(user) {
  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  const navMenu = document.querySelector(".nav-menu");

  if (!loginBtn || !registerBtn || !navMenu) return;

  loginBtn.style.display = "none";
  registerBtn.style.display = "none";

  const userMenuItem = document.createElement("li");
  userMenuItem.className = "user-menu-item";

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
        <a href="profile.html"><i class="fas fa-user"></i> Hồ sơ</a>
        <a href="profile.html#my-books"><i class="fas fa-book"></i> Sách của tôi</a>
        <a href="profile.html#favorites"><i class="fas fa-heart"></i> Sách yêu thích</a>
        <a href="profile.html#downloads"><i class="fas fa-download"></i> Lịch sử tải xuống</a>
        ${
          user.role === "admin"
            ? '<a href="admin-dashboard.html"><i class="fas fa-cog"></i> Quản trị</a>'
            : ""
        }
        <a href="#" id="logout-btn"><i class="fas fa-sign-out-alt"></i> Đăng xuất</a>
      </div>
    </div>
  `;

  navMenu.appendChild(userMenuItem);

  // Thêm custom CSS để sửa vị trí dropdown menu
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
      gap: 8px;
      cursor: pointer;
      color: var(--dark);
      font-weight: 500;
    }
    
    .user-menu-toggle i {
      margin-left: 5px;
      font-size: 0.8rem;
      transition: transform 0.3s ease;
    }
    
    .user-menu:hover .user-menu-toggle i {
      transform: rotate(180deg);
    }
    
    .user-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      background-color: white;
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      min-width: 200px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(10px);
      transition: all 0.3s ease;
      z-index: 1000;
    }
    
    .user-menu {
      position: relative;
    }
    
    .user-menu:hover .user-dropdown {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  document.getElementById("logout-btn").addEventListener("click", function (e) {
    e.preventDefault();

    if (confirm("Bạn có chắc muốn đăng xuất?")) {
      apiService.auth.logout();

      if (typeof notifications !== "undefined") {
        notifications.info("Đăng xuất thành công!");
      }

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  });
}

function updateUnauthenticatedUI() {
  state.isAuthenticated = false;
  state.currentUser = null;

  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");

  if (loginBtn) loginBtn.style.display = "block";
  if (registerBtn) registerBtn.style.display = "block";
}

function initializeMobileMenu() {
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const navMenu = document.getElementById("nav-menu");

  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener("click", function () {
      mobileMenuToggle.classList.toggle("active");
      navMenu.classList.toggle("active");
    });

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

function setupSearch() {
  const searchBar = document.querySelector(".search-bar");
  const searchInput = document.getElementById("search-input");

  if (searchBar && searchInput) {
    searchBar.addEventListener("submit", function (e) {
      e.preventDefault();
      const searchQuery = searchInput.value.trim();

      if (searchQuery) {
        const pagesPath = "";
        window.location.href = `${pagesPath}search-results.html?q=${encodeURIComponent(
          searchQuery
        )}`;
      }
    });

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

    setInterval(cyclePlaceholders, 3000);
  }
}

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

function showAuthModal(type) {
  if (!document.querySelector(".auth-modal")) {
    createAuthModal();
  }

  const modal = document.querySelector(".auth-modal");
  modal.classList.add("active");

  setActiveAuthTab(type);

  document.addEventListener("keydown", function escHandler(e) {
    if (e.key === "Escape") {
      closeAuthModal();
      document.removeEventListener("keydown", escHandler);
    }
  });
}

function createAuthModal() {
  const modalHTML = `
    <div class="auth-modal">
      <div class="auth-modal-backdrop"></div>
      <div class="auth-modal-content">
        <button class="auth-modal-close">&times;</button>
        
        <div class="auth-modal-header">
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
                <input type="password" id="login-password" autocomplete="current-password" required>
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
                <input type="password" id="register-password" autocomplete="new-password" required>
                <button type="button" class="password-toggle">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <label for="register-confirm-password">Xác nhận mật khẩu</label>
              <div class="form-input-group">
                <i class="fas fa-lock"></i>
                <input type="password" id="register-confirm-password" autocomplete="new-password" required>
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

  document.body.insertAdjacentHTML("beforeend", modalHTML);

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
    
    .auth-message.warning {
      background-color: rgba(255, 209, 102, 0.1);
      color: var(--warning);
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

  setupAuthModalEvents();
}

function setupAuthModalEvents() {
  const modal = document.querySelector(".auth-modal");
  const backdrop = document.querySelector(".auth-modal-backdrop");
  const closeBtn = document.querySelector(".auth-modal-close");
  const tabs = document.querySelectorAll(".auth-tab");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const passwordToggles = document.querySelectorAll(".password-toggle");

  backdrop.addEventListener("click", closeAuthModal);

  closeBtn.addEventListener("click", closeAuthModal);

  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      setActiveAuthTab(this.dataset.tab);
    });
  });

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

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    const rememberMe = document.getElementById("remember-me").checked;

    if (!username || !password) {
      showAuthMessage("Vui lòng nhập đầy đủ thông tin!", "error");
      return;
    }

    try {
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
      submitBtn.disabled = true;

      const response = await apiService.auth.login({ username, password });

      if (response.accessToken) {
        apiService.auth.setUser(response);
        showAuthMessage("Đăng nhập thành công!", "success");

        if (rememberMe) {
          localStorage.setItem("remember", true);
        } else {
          localStorage.removeItem("remember");
        }

        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showAuthMessage(response.message || "Đăng nhập thất bại!", "error");
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    } catch (error) {
      showAuthMessage("Lỗi kết nối server!", "error");
      console.error("Login error:", error);

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
    }
  });

  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("register-username").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById(
      "register-confirm-password"
    ).value;

    if (!username || !email || !password || !confirmPassword) {
      showAuthMessage("Vui lòng nhập đầy đủ thông tin!", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAuthMessage("Email không hợp lệ!", "error");
      return;
    }

    if (password !== confirmPassword) {
      showAuthMessage("Mật khẩu xác nhận không khớp!", "error");
      return;
    }

    if (password.length < 6) {
      showAuthMessage("Mật khẩu phải có ít nhất 6 ký tự!", "error");
      return;
    }

    try {
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
      submitBtn.disabled = true;

      const response = await apiService.auth.register({
        username,
        email,
        password,
      });

      if (response.message && !response.error) {
        showAuthMessage(
          "Đăng ký thành công! Bạn có thể đăng nhập ngay.",
          "success"
        );

        setTimeout(() => {
          setActiveAuthTab("login");

          document.getElementById("login-username").value = username;
        }, 2000);
      } else {
        showAuthMessage(response.message || "Đăng ký thất bại!", "error");

        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    } catch (error) {
      showAuthMessage("Lỗi kết nối server!", "error");
      console.error("Register error:", error);

      const submitBtn = registerForm.querySelector('button[type="submit"]');
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
    }
  });

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

function setActiveAuthTab(tabName) {
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });

  document.querySelectorAll(".auth-form").forEach((form) => {
    form.classList.toggle("active", form.id === `${tabName}-form`);
  });

  const modalTitle = document.getElementById("auth-modal-title");
  if (modalTitle) {
    modalTitle.textContent = tabName === "login" ? "Đăng nhập" : "Đăng ký";
  }

  const messageEl = document.getElementById("auth-message");
  if (messageEl) {
    messageEl.className = "auth-message";
    messageEl.textContent = "";
  }
}

function showAuthMessage(message, type) {
  const messageEl = document.getElementById("auth-message");
  if (messageEl) {
    messageEl.textContent = message;
    messageEl.className = `auth-message ${type}`;
  }
}

function closeAuthModal() {
  const modal = document.querySelector(".auth-modal");
  if (modal) {
    modal.classList.remove("active");
  }
}

function loadPageSpecificContent() {
  if (document.getElementById("home-page")) {
    console.log("Trang chủ được phát hiện, đang tải nội dung...");
    loadHomePage();
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (
    urlParams.has("id") &&
    window.location.href.includes("book-detail.html")
  ) {
    loadBookDetail(urlParams.get("id"));
  }

  if (
    urlParams.has("q") &&
    window.location.href.includes("search-results.html")
  ) {
    loadSearchResults(urlParams.get("q"));
  }

  if (urlParams.has("id") && window.location.href.includes("categories.html")) {
    loadCategoryPage(urlParams.get("id"));
  }
}

async function loadHomePage() {
  try {
    console.log("Đang tải trang chủ...");

    const categories = await apiService.categories.getAll();
    console.log("Danh mục đã tải:", categories);
    state.categories = categories;

    const categoryGrid = document.querySelector(".category-grid");
    if (categoryGrid) {
      console.log("Đã tìm thấy phần tử .category-grid");

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

    completeLoading();
  } catch (error) {
    console.error("Error loading homepage:", error);
    completeLoading();
  }
}

function renderCategories(categories, container) {
  console.log("Đang render danh mục:", categories);
  if (!container) {
    console.error("Container không tồn tại!");
    return;
  }

  container.innerHTML = "";

  if (!categories || categories.length === 0) {
    console.log("Không có danh mục để hiển thị");
    container.innerHTML = "<p>Không có danh mục nào để hiển thị.</p>";
    return;
  }

  categories.forEach((category) => {
    const categoryEl = document.createElement("div");
    categoryEl.className = "category-card animate-item";

    const iconMap = {
      // Danh mục hiện có
      "Văn học": "book",
      "Kinh tế": "chart-line",
      "Khoa học": "flask",
      "Công nghệ": "laptop-code",
      "Lịch sử": "landmark",
      "Tâm lý": "brain",
      "Nghệ thuật": "palette",
      "Y học": "user-doctor",
      "Giáo dục": "graduation-cap",

      "Tiểu thuyết": "book-open",
      "Truyện ngắn": "bookmark",
      Thơ: "feather",
      "Truyện tranh": "image",
      "Ngôn tình": "heart",
      "Kinh điển": "book-journal-whills",
      "Hồi ký": "book-bookmark",

      "Toán học": "square-root-variable",
      "Vật lý": "atom",
      "Sinh học": "dna",
      "Triết học": "lightbulb",
      "Ngôn ngữ": "language",
      "Xã hội học": "users",
      "Tâm lý học": "brain",
      "Chính trị": "landmark-dome",
      "Pháp luật": "scale-balanced",
      "Kinh tế học": "coins",

      "Kỹ năng sống": "hands",
      "Phát triển bản thân": "person-rays",
      "Kinh doanh": "wallet",
      "Quản lý thời gian": "clock",
      "Làm giàu": "money-bill-trend-up",
      "Khởi nghiệp": "rocket",
      Marketing: "bullhorn",
      "Bán hàng": "store",
      "Quản lý": "users-gear",
      "Lãnh đạo": "crown",

      "Du lịch": "plane",
      "Ẩm thực": "utensils",
      "Thể thao": "person-running",
      "Âm nhạc": "music",
      "Điện ảnh": "film",
      "Nhiếp ảnh": "camera",
      "Làm vườn": "seedling",
      "Thủ công": "scissors",
      Game: "gamepad",

      "Kĩ thuật": "screwdriver-wrench",
      "Kiến trúc": "drafting-compass",
      "Thiết kế": "pen-ruler",
      "Nông nghiệp": "wheat-awn",
      "Môi trường": "leaf",
      "Công nghệ thông tin": "microchip",
      "An ninh mạng": "shield-halved",
      "Phần mềm": "code",
      "Trí tuệ nhân tạo": "robot",
      "Dữ liệu": "database",

      "Tôn giáo": "place-of-worship",
      "Tâm linh": "spa",
      "Huyền bí": "hat-wizard",
      "Phong thủy": "yin-yang",
      Thiền: "om",
      Yoga: "person-praying",

      "Thiếu nhi": "child",
      "Tuổi teen": "child-reaching",
      "Phụ nữ": "venus",
      "Nam giới": "mars",
      "Người cao tuổi": "person-cane",

      "Bách khoa": "book-atlas",
      "Từ điển": "book-open-reader",
      "Sách nói": "headphones",
      "Sách điện tử": "tablet-screen-button",
    };

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

    categoryEl.addEventListener("click", () => {
      const pagesPath = "";
      window.location.href = `${pagesPath}categories.html?id=${category.id}`;
    });

    container.appendChild(categoryEl);
  });
}

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
    let coverPath = imageUtils
      ? imageUtils.processImagePath(book.coverPath)
      : book.coverPath || "/api/placeholder/220/250";

    const bookCard = document.createElement("div");
    bookCard.className = "book-card animate-item";
    bookCard.setAttribute("data-index", index);

    const isNew =
      new Date(book.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

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

    bookCard.addEventListener("click", () => {
      const pagesPath = "";
      window.location.href = `${pagesPath}book-detail.html?id=${book.id}`;
    });

    container.appendChild(bookCard);
  });
}

async function loadBookDetail(bookId) {
  try {
    const book = await apiService.books.getById(bookId);

    if (!book || !book.id) {
      throw new Error("Không tìm thấy dữ liệu sách");
    }

    // Thêm dòng này để gán dữ liệu sách vào biến currentBook
    currentBook = book;

    document.title = `${book.title} - EBook Haven`;

    const bookInfoContainer = document.getElementById("book-info");
    if (bookInfoContainer) {
      renderBookDetail(book, bookInfoContainer);
    }

    loadBookComments(bookId);

    if (book.categoryId) {
      loadRelatedBooks(book.categoryId, book.id);
    }

    updateRatingSectionVisibility();

    completeLoading();
  } catch (error) {
    console.error("Lỗi khi tải chi tiết sách:", error);

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

function renderBookDetail(book, bookInfoContainer) {
  const coverPath = imageUtils.processImagePath(book.coverPath);

  const isNew =
    new Date(book.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  bookInfoContainer.innerHTML = `
    <div class="book-detail-image">
      <img src="${coverPath}" 
           alt="${book.title}" 
           onerror="this.onerror=null; this.src='/api/placeholder/300/450'; console.log('Image load error for detail');"
           style="min-height: 300px; background-color: #f0f0f0; object-fit: cover;">
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
          book.category?.name || "Không phân loại"
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
          <div class="book-stat-value">${
            book.rating || "0"
          } <i class="fas fa-star"></i></div>
          <div class="book-stat-label">Đánh giá</div>
        </div>
        <div class="book-stat">
          <div class="book-stat-value">${
            book.downloadCount || "0"
          } <i class="fas fa-download"></i></div>
          <div class="book-stat-label">Lượt tải</div>
        </div>
      </div>
      
      <div class="book-detail-description">
        <h3><i class="fas fa-info-circle"></i> Giới thiệu sách</h3>
        <p>${book.description || "Không có mô tả."}</p>
      </div>
      
      <div class="book-detail-actions">
        <button class="btn btn-primary" id="download-btn">
          <i class="fas fa-download"></i> Tải xuống
        </button>
        <button class="btn btn-secondary" id="favorite-btn">
          <i class="far fa-heart"></i> Thêm vào yêu thích
        </button>
      </div>
      ${
        book.uploader
          ? `
      <div class="book-uploader">
        <i class="fas fa-user-circle"></i>
        <p>Đăng tải bởi: ${book.uploader.username} (${new Date(
              book.createdAt
            ).toLocaleDateString()})</p>
      </div>
      `
          : ""
      }
    </div>
  `;

  document
    .getElementById("download-btn")
    .addEventListener("click", function () {
      downloadBook(book.id);
    });

  // Nếu có lỗi ở đây, hãy xử lý nó
  try {
    renderFavoriteButton(book.id);
  } catch (error) {
    console.error("Error rendering favorite button:", error);
  }
}

// Các hàm cần thiết cho book-detail
function updateRatingSectionVisibility() {
  const ratingSection = document.getElementById("rating-section");
  if (ratingSection && apiService.auth.isAuthenticated()) {
    ratingSection.style.display = "block";
    setupRatingStars();
  }
}

function setupRatingStars() {
  const stars = document.querySelectorAll("#star-rating i");

  stars.forEach((star) => {
    star.addEventListener("mouseover", function () {
      const rating = this.dataset.rating;
      highlightStars(rating);
    });

    star.addEventListener("mouseout", function () {
      highlightStars(currentRating);
    });

    star.addEventListener("click", function () {
      currentRating = this.dataset.rating;
      highlightStars(currentRating);
    });
  });

  document
    .getElementById("submit-rating")
    .addEventListener("click", async function () {
      if (currentRating === 0) {
        notifications.warning("Vui lòng chọn số sao đánh giá!");
        return;
      }

      try {
        const comment = document.getElementById("comment").value;
        await apiService.books.rate(currentBook.id, currentRating, comment);

        notifications.success("Đã gửi đánh giá thành công!");

        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error("Error submitting rating:", error);
        notifications.error("Lỗi khi gửi đánh giá");
      }
    });
}

function highlightStars(rating) {
  const stars = document.querySelectorAll("#star-rating i");

  stars.forEach((star) => {
    const starRating = parseInt(star.dataset.rating);

    if (starRating <= rating) {
      star.className = "fas fa-star";
    } else {
      star.className = "far fa-star";
    }
  });
}

async function loadBookComments(bookId) {
  try {
    const comments = await apiService.books.getComments(bookId);

    if (comments && comments.length > 0) {
      document.getElementById("comments-section").style.display = "block";
      renderComments(comments);
    }
  } catch (error) {
    console.error("Error loading comments:", error);
  }
}

function renderComments(comments) {
  const container = document.getElementById("comments-container");
  container.innerHTML = "";

  comments.forEach((comment) => {
    const date = new Date(comment.createdAt);
    const formattedDate = date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let stars = "";
    for (let i = 1; i <= 5; i++) {
      if (i <= comment.rating) {
        stars += '<i class="fas fa-star"></i>';
      } else {
        stars += '<i class="far fa-star"></i>';
      }
    }

    const commentElement = document.createElement("div");
    commentElement.className = "comment animate-fadeIn";
    commentElement.innerHTML = `
      <div class="comment-header">
        <div class="comment-user">${
          comment.user.displayName || comment.user.username
        }</div>
        <div class="comment-date">${formattedDate}</div>
      </div>
      <div class="comment-rating">${stars}</div>
      <div class="comment-content">${comment.comment}</div>
    `;

    container.appendChild(commentElement);
  });
}

async function renderFavoriteButton(bookId) {
  const favoriteBtn = document.getElementById("favorite-btn");
  const isFavorite = await checkFavoriteStatus(bookId);

  if (isFavorite) {
    favoriteBtn.innerHTML = '<i class="fas fa-heart"></i> Xóa khỏi yêu thích';
    favoriteBtn.className = "btn btn-danger";
    favoriteBtn.onclick = () => removeFavorite(bookId);
  } else {
    favoriteBtn.innerHTML = '<i class="far fa-heart"></i> Thêm vào yêu thích';
    favoriteBtn.className = "btn btn-secondary";
    favoriteBtn.onclick = () => addFavorite(bookId);
  }
}

async function checkFavoriteStatus(bookId) {
  if (!apiService.auth.isAuthenticated()) return false;

  try {
    const favorites = await apiService.users.getFavoriteBooks();
    return favorites.some((fav) => fav.id === parseInt(bookId));
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return false;
  }
}

async function addFavorite(bookId) {
  if (!apiService.auth.isAuthenticated()) {
    showAuthModal("login");
    return;
  }

  try {
    console.log("Adding book to favorites:", bookId);
    const response = await apiService.users.addToFavorites(bookId);

    console.log("Add to favorites response:", response);

    if (response.success || response.message) {
      notifications.success(
        response.message || "Đã thêm sách vào danh sách yêu thích!"
      );
      await renderFavoriteButton(bookId);
    } else {
      notifications.error("Có lỗi xảy ra khi thêm vào yêu thích");
    }
  } catch (error) {
    console.error("Error adding to favorites:", error);
    notifications.error(
      "Có lỗi xảy ra khi thêm vào yêu thích: " +
        (error.message || "Lỗi không xác định")
    );
  }
}

async function removeFavorite(bookId) {
  if (!apiService.auth.isAuthenticated()) {
    showAuthModal("login");
    return;
  }

  try {
    console.log("Removing book from favorites:", bookId);
    const response = await apiService.users.removeFromFavorites(bookId);

    console.log("Remove from favorites response:", response);

    if (response.success || response.message) {
      notifications.success(
        response.message || "Đã xóa sách khỏi danh sách yêu thích!"
      );
      await renderFavoriteButton(bookId);
    } else {
      notifications.error("Có lỗi xảy ra khi xóa khỏi yêu thích");
    }
  } catch (error) {
    console.error("Error removing from favorites:", error);
    notifications.error(
      "Có lỗi xảy ra khi xóa khỏi yêu thích: " +
        (error.message || "Lỗi không xác định")
    );
  }
}

function downloadBook(bookId) {
  apiService.books.download(bookId);
  notifications.success("Đang tải xuống sách...");
}

async function loadRelatedBooks(categoryId, currentBookId) {
  try {
    const relatedBooks = await apiService.categories.getBooks(categoryId);

    const filteredBooks = relatedBooks
      .filter((relatedBook) => relatedBook.id !== parseInt(currentBookId))
      .slice(0, 4);

    if (filteredBooks.length > 0) {
      renderBooks(filteredBooks, document.getElementById("related-books"));
    } else {
      document.querySelector(".related-books").style.display = "none";
    }
  } catch (error) {
    console.error("Error loading related books:", error);
    document.querySelector(".related-books").style.display = "none";
  }
}

async function loadCategoryPage(categoryId) {
  try {
    const category = await apiService.categories.getById(categoryId);

    if (category) {
      document.getElementById("category-title").textContent = category.name;

      if (category.books && category.books.length > 0) {
        renderBooks(
          category.books,
          document.getElementById("category-books-grid")
        );
        document.getElementById("no-books").style.display = "none";
      } else {
        document.getElementById("category-books-grid").style.display = "none";
        document.getElementById("no-books").style.display = "block";
      }
    }

    completeLoading();
  } catch (error) {
    console.error("Error loading category page:", error);
    document.getElementById("category-books-grid").style.display = "none";
    document.getElementById("no-books").style.display = "block";
    completeLoading();
  }
}

window.addEventListener("load", function () {
  if (document.getElementById("home-page")) {
    console.log("DOM đã load hoàn tất, kiểm tra lại việc tải trang chủ...");

    const categoryGrid = document.querySelector(".category-grid");
    if (categoryGrid && (!state.categories || state.categories.length === 0)) {
      console.log("Tải lại danh mục...");
      loadHomePage();
    }
  }
});
