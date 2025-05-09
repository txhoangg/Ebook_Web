// File: /assets/js/helper.js
const pathHelper = {
  // Chuyển đổi đường dẫn tương đối thành tuyệt đối
  toAbsolute: function (path) {
    if (path.startsWith("/")) return path;
    return "/" + path;
  },

  // Tạo URL cho trang HTML
  toPage: function (pageName) {
    if (pageName === "index.html" || pageName === "home") {
      return "/";
    }
    if (pageName.startsWith("/")) return pageName;
    // Không thêm tiền tố /pages/ nữa
    return "/" + pageName;
  },

  // Tạo URL cho trang admin
  toAdminPage: function (pageName) {
    if (pageName.startsWith("/")) return pageName;
    // Thay đổi cách xử lý với admin
    return "/" + pageName;
  },

  // Tạo URL cho tài nguyên tĩnh
  toAsset: function (path) {
    if (path.startsWith("/")) return path;
    return "/assets/" + path;
  },
};
