const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000/api"
    : "/api";

const handleApiError = (error, defaultMessage) => {
  console.error(defaultMessage, error);
  return {
    success: false,
    message: error.message || defaultMessage,
  };
};

const apiService = {
  auth: {
    login: async (credentials) => {
      try {
        const response = await fetch(`${API_URL}/auth/signin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Đăng nhập thất bại");
        }

        return data;
      } catch (error) {
        return handleApiError(error, "Đã xảy ra lỗi khi đăng nhập");
      }
    },

    register: async (userData) => {
      try {
        const response = await fetch(`${API_URL}/auth/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Đăng ký thất bại");
        }

        return data;
      } catch (error) {
        return handleApiError(error, "Đã xảy ra lỗi khi đăng ký tài khoản");
      }
    },

    getCurrentUser: () => {
      try {
        const userData = localStorage.getItem("user");
        if (!userData) return null;
        return JSON.parse(userData);
      } catch (error) {
        console.error("Lỗi khi đọc thông tin người dùng:", error);
        return null;
      }
    },

    setUser: (user) => {
      try {
        console.log("Lưu thông tin người dùng vào localStorage:", user);
        localStorage.setItem("user", JSON.stringify(user));
      } catch (error) {
        console.error("Lỗi khi lưu thông tin người dùng:", error);
      }
    },

    logout: () => {
      try {
        localStorage.removeItem("user");
      } catch (error) {
        console.error("Lỗi khi đăng xuất:", error);
      }
    },

    isAuthenticated: () => {
      const user = apiService.auth.getCurrentUser();
      return user !== null && user.accessToken !== undefined;
    },

    checkTokenValidity: () => {
      const user = apiService.auth.getCurrentUser();
      if (!user || !user.accessToken) return false;

      return true;
    },
  },

  users: {
    getProfile: async () => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${API_URL}/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("Dữ liệu hồ sơ từ API:", data);
      return data;
    },

    updateProfile: async (data) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      console.log("Gửi yêu cầu cập nhật hồ sơ với dữ liệu:", data);

      const response = await fetch(`${API_URL}/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log("Kết quả cập nhật từ API:", result);

      if (result.success || result.message?.includes("thành công")) {
        const currentUser = apiService.auth.getCurrentUser();
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            displayName: data.displayName || currentUser.displayName,
            bio: data.bio || currentUser.bio,
          };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          console.log(
            "Đã cập nhật thông tin người dùng trong localStorage:",
            updatedUser
          );
        }
      }

      return result;
    },

    getMyBooks: async () => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${API_URL}/users/books`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.json();
    },

    getFavoriteBooks: async () => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${API_URL}/users/favorites`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.json();
    },

    getDownloadHistory: async () => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${API_URL}/users/downloads`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Download history response status:", response.status);
      return response.json();
    },

    addToFavorites: async (bookId) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      console.log(`Adding book ${bookId} to favorites`);

      const response = await fetch(`${API_URL}/users/favorites/${bookId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.json();
    },

    removeFromFavorites: async (bookId) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      console.log(`Removing book ${bookId} from favorites`);

      const response = await fetch(`${API_URL}/users/favorites/${bookId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.json();
    },
  },

  books: {
    getAll: async (params = {}) => {
      let url = `${API_URL}/books`;

      if (Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(params).toString();
        url = `${url}?${queryString}`;
      }

      const response = await fetch(url);
      return response.json();
    },

    getById: async (id) => {
      const response = await fetch(`${API_URL}/books/${id}`);
      return response.json();
    },

    getFeatured: async () => {
      const response = await fetch(`${API_URL}/books/featured`);
      return response.json();
    },

    getLatest: async () => {
      const response = await fetch(
        `${API_URL}/books?sort=createdAt:desc&limit=4`
      );
      return response.json();
    },

    create: async (bookData) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const formData = new FormData();

      Object.keys(bookData).forEach((key) => {
        if (key !== "file" && key !== "cover") {
          formData.append(key, bookData[key]);
        }
      });

      if (bookData.file) {
        formData.append("file", bookData.file);
      }

      if (bookData.cover) {
        formData.append("cover", bookData.cover);
      }

      const response = await fetch(`${API_URL}/books`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      return response.json();
    },

    update: async (id, bookData) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const formData = new FormData();

      Object.keys(bookData).forEach((key) => {
        if (key !== "file" && key !== "cover") {
          formData.append(key, bookData[key]);
        }
      });

      if (bookData.file) {
        formData.append("file", bookData.file);
      }

      if (bookData.cover) {
        formData.append("cover", bookData.cover);
      }

      const response = await fetch(`${API_URL}/books/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      return response.json();
    },

    delete: async (id) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${API_URL}/books/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.json();
    },

    download: async (id) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      console.log(`Downloading book ${id} with token: ${token ? "Yes" : "No"}`);

      const downloadUrl = token
        ? `${API_URL}/books/${id}/download?token=${token}`
        : `${API_URL}/books/${id}/download`;

      window.open(downloadUrl);
    },

    rate: async (id, rating, comment = "") => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${API_URL}/books/${id}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment }),
      });

      return response.json();
    },

    getComments: async (id) => {
      const response = await fetch(`${API_URL}/books/${id}/comments`);
      return response.json();
    },
  },

  categories: {
    getAll: async () => {
      const response = await fetch(`${API_URL}/categories`);
      return response.json();
    },

    getById: async (id) => {
      const response = await fetch(`${API_URL}/categories/${id}`);
      return response.json();
    },

    getBooks: async (categoryId) => {
      const response = await fetch(`${API_URL}/books?category=${categoryId}`);
      return response.json();
    },

    create: async (data) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${API_URL}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      return response.json();
    },

    update: async (id, data) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${API_URL}/categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      return response.json();
    },

    delete: async (id) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${API_URL}/categories/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.json();
    },
  },

  admin: {
    getStats: async () => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${API_URL}/admin/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.json();
    },

    getLatestBooks: async (limit = 5) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(
        `${API_URL}/admin/books/latest?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.json();
    },

    getLatestUsers: async (limit = 5) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(
        `${API_URL}/admin/users/latest?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.json();
    },

    getAllBooks: async (params = {}) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      let url = `${API_URL}/admin/books`;

      if (Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(params).toString();
        url = `${url}?${queryString}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.json();
    },

    getAllUsers: async (params = {}) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      let url = `${API_URL}/admin/users`;

      if (Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(params).toString();
        url = `${url}?${queryString}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.json();
    },

    updateBookStatus: async (bookId, status, featured = null) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const data = { status };

      if (featured !== null) {
        data.featured = featured;
      }

      const response = await fetch(`${API_URL}/admin/books/${bookId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      return response.json();
    },

    updateUserRole: async (userId, role) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      return response.json();
    },

    getUserDetails: async (userId) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.json();
    },

    updateUserDetails: async (userId, data) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      return response.json();
    },

    deleteUser: async (userId) => {
      const token = apiService.auth.getCurrentUser()?.accessToken;
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.json();
    },
  },
};
