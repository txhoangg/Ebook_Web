// Quản lý xác thực người dùng
const authService = {
  // Trạng thái xác thực
  isAuthenticated: false,
  currentUser: null,

  // Kiểm tra trạng thái đăng nhập từ localStorage
  init() {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        this.currentUser = JSON.parse(userData);
        this.isAuthenticated = true;
        return true;
      }
    } catch (error) {
      console.error("Lỗi khi khởi tạo dịch vụ xác thực:", error);
    }
    return false;
  },

  // Đăng nhập
  login(username, password) {
    return apiService.auth.login({ username, password }).then((response) => {
      if (response.accessToken) {
        this.currentUser = response;
        this.isAuthenticated = true;
        localStorage.setItem("user", JSON.stringify(response));
        return true;
      }
      return false;
    });
  },

  // Đăng ký
  register(userData) {
    return apiService.auth.register(userData);
  },

  // Đăng xuất
  logout() {
    this.currentUser = null;
    this.isAuthenticated = false;
    localStorage.removeItem("user");
  },

  // Lấy thông tin người dùng hiện tại
  getCurrentUser() {
    return this.currentUser;
  },

  // Kiểm tra người dùng đã đăng nhập chưa
  checkLoggedIn() {
    return this.isAuthenticated;
  },

  // Kiểm tra quyền admin
  isAdmin() {
    return this.isAuthenticated && this.currentUser.role === "admin";
  },

  // Thêm hàm tiện ích khác nếu cần
  getAccessToken() {
    return this.currentUser ? this.currentUser.accessToken : null;
  },

  // Cập nhật thông tin người dùng trong localStorage
  updateUserInfo(userData) {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, ...userData };
      localStorage.setItem("user", JSON.stringify(this.currentUser));
    }
  },
};

// Khởi tạo dịch vụ khi trang web tải
document.addEventListener("DOMContentLoaded", () => {
  authService.init();
});
