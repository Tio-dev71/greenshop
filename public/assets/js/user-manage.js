document.addEventListener("DOMContentLoaded", function () {
    const API_BASE_URL = window.location.origin;
    const userTableBody = document.getElementById("user-table-body");
    const searchInput = document.getElementById("user-search-input");
    const paginationControls = document.getElementById('pagination-controls');
    const adminLogoutButton = document.getElementById('admin-logout-button');
    const adminNameDisplay = document.getElementById('admin-name-display');
    const userManagerMessageEl = document.getElementById('user-manager-message');

    // Lấy các element filter mới
    const userStatusFilterSelect = document.getElementById('user-status-filter');
    const userSortBySelect = document.getElementById('user-sort-by');
    const userSortDirectionSelect = document.getElementById('user-sort-direction');

    let currentUsersPage = 1;
    let currentUserSearchTerm = '';
    // Cập nhật giá trị mặc định cho sort và thêm filter status
    let currentUserStatusFilter = ''; // Mặc định là tất cả status
    let currentSortBy = 'created_at';
    let currentSortDirection = 'desc';
    let searchDebounceTimer;


    function getAuthToken() {
        return localStorage.getItem('authToken');
    }

    function getAuthHeaders() {
        const token = getAuthToken();
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    function getAuthUser() {
        const userString = localStorage.getItem('authUser');
        if (userString) {
            try { return JSON.parse(userString); }
            catch (e) { console.error("Error parsing authUser", e); return null; }
        }
        return null;
    }

    const currentUser = getAuthUser();
    if (currentUser && adminNameDisplay) {
        adminNameDisplay.textContent = `Chào, ${currentUser.name}`;
    }

    if (adminLogoutButton) {
        adminLogoutButton.addEventListener('click', async function(event) {
            event.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
                const token = getAuthToken();
                if (token) {
                    try {
                        await fetch(`${API_BASE_URL}/api/logout`, { method: 'POST', headers: getAuthHeaders() });
                    } catch (error) { console.error('Error calling server logout API:', error); }
                }
                localStorage.removeItem('authToken');
                localStorage.removeItem('authUser');
                window.location.href = 'Login.html';
            }
        });
    }

    function displayPageMessage(message, type = 'error', duration = 4000) {
        if (userManagerMessageEl) {
            userManagerMessageEl.textContent = message;
            userManagerMessageEl.className = 'message-area';
            userManagerMessageEl.classList.add(type === 'success' ? 'success-message' : 'error-message');
            userManagerMessageEl.style.display = 'block';
            if (duration > 0) {
                setTimeout(() => {
                    userManagerMessageEl.textContent = '';
                    userManagerMessageEl.style.display = 'none';
                }, duration);
            }
        }
    }


    // Cập nhật hàm fetchUsers để chấp nhận thêm statusFilter
    async function fetchUsers(page = 1, searchTerm = '', statusFilter = '', sortBy = 'created_at', sortDirection = 'desc') {
        currentUsersPage = page;
        currentUserSearchTerm = searchTerm;
        currentUserStatusFilter = statusFilter; // Lưu trạng thái lọc hiện tại
        currentSortBy = sortBy;
        currentSortDirection = sortDirection;

        let url = `${API_BASE_URL}/api/admin/users?page=${page}&sort_by=${sortBy}&sort_direction=${sortDirection}`;
        if (searchTerm) {
            url += `&search=${encodeURIComponent(searchTerm)}`;
        }
        if (statusFilter !== '') { // Chỉ thêm tham số status nếu có giá trị (không phải rỗng)
            url += `&status=${encodeURIComponent(statusFilter)}`;
        }

        if (userTableBody) userTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Đang tải danh sách người dùng...</td></tr>`;
        else { console.error("userTableBody is not found!"); return; }


        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                if (response.status === 401) {
                    displayPageMessage('Phiên đăng nhập hết hạn hoặc không có quyền. Đang chuyển hướng...', 'error', 0);
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('authUser');
                    setTimeout(() => { window.location.href = 'Login.html'; }, 2000);
                    return;
                }
                const errorData = await response.json().catch(() => ({ message: `Lỗi ${response.status}` }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data && result.data.data) {
                renderUsers(result.data.data);
                renderPagination(result.data);
            } else {
                console.error("Failed to fetch users:", result.message || "Unknown error", result);
                userTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Không tải được dữ liệu người dùng. ${result.message || ''}</td></tr>`;
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            userTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Lỗi: ${error.message}</td></tr>`;
        }
    }

    function renderUsers(users) {
        if (!userTableBody) return;
        userTableBody.innerHTML = "";
        if (!users || users.length === 0) {
            userTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Không tìm thấy người dùng nào.</td></tr>`;
            return;
        }

        users.forEach(user => {
            const row = userTableBody.insertRow();
            row.dataset.userId = user.id;

            const formattedTotalSpending = Number(user.tong_chi_tieu || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
            const statusText = user.status === 1 ? 'Hoạt động' : 'Bị khóa';
            const statusClass = user.status === 1 ? 'status-active' : 'status-locked';
            const actionButtonText = user.status === 1 ? 'Khóa' : 'Mở khóa';
            const actionButtonClass = user.status === 1 ? 'btn-lock' : 'btn-unlock'; // Bạn có thể thêm class riêng cho nút khóa/mở khóa nếu muốn style khác

            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.ho_ten || 'Chưa cập nhật'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.so_dien_thoai || 'N/A'}</td>
                <td>${user.so_don_da_mua || 0}</td>
                <td>${formattedTotalSpending}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>${user.ngay_tao || 'N/A'}</td>
                <td class="action">
                    <button class="user-action-btn ${actionButtonClass}" data-user-id="${user.id}" data-current-status="${user.status}">
                        ${actionButtonText}
                    </button>
                </td>
            `;
        });
        addUserActionListeners();
    }

    function renderPagination(paginationData) {
        if (!paginationControls || !paginationData || !paginationData.links || paginationData.links.length === 0) {
            if (paginationControls) paginationControls.innerHTML = '';
            return;
        }
        paginationControls.innerHTML = '';

        paginationData.links.forEach(link => {
            const pageButton = document.createElement('button');
            let label = link.label;
            if (label.includes('&laquo; Previous')) label = '← Trước';
            else if (label.includes('Next &raquo;')) label = 'Sau →';
            pageButton.innerHTML = label;

            pageButton.disabled = !link.url;
            if (link.active) {
                pageButton.classList.add('active');
            }

            if (link.url) {
                pageButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    try {
                        const urlObject = new URL(link.url);
                        const pageNumber = urlObject.searchParams.get('page');
                        if (pageNumber) {
                            fetchUsers(pageNumber, currentUserSearchTerm, currentUserStatusFilter, currentSortBy, currentSortDirection);
                        }
                    } catch (error) {
                        console.error("Error parsing pagination URL:", error, "URL was:", link.url);
                    }
                });
            } else if (label === "...") {
                pageButton.disabled = true;
            }
            paginationControls.appendChild(pageButton);
        });
    }

    function addUserActionListeners() {
        document.querySelectorAll('.user-action-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const userId = this.dataset.userId;
                const currentStatus = parseInt(this.dataset.currentStatus);
                const newStatus = currentStatus === 1 ? 0 : 1;
                const actionText = currentStatus === 1 ? "khóa" : "mở khóa";

                if (confirm(`Bạn có chắc muốn ${actionText} tài khoản ID: ${userId}?`)) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/status`, {
                            method: 'PUT',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ status: newStatus })
                        });
                        const result = await response.json();
                        if (response.ok && result.success) {
                            displayPageMessage(`Đã ${actionText} tài khoản ${userId} thành công.`, 'success');
                            fetchUsers(currentUsersPage, currentUserSearchTerm, currentUserStatusFilter, currentSortBy, currentSortDirection);
                        } else {
                            displayPageMessage(`Lỗi: ${result.message || 'Cập nhật trạng thái thất bại.'}`, 'error');
                        }
                    } catch (error) {
                        console.error(`Error ${actionText} user:`, error);
                        displayPageMessage(`Đã có lỗi xảy ra khi ${actionText} tài khoản.`, 'error');
                    }
                }
            });
        });
    }

    // Hàm chung để xử lý thay đổi filter/sort
    function handleFilterOrSortChange() {
        fetchUsers(1,
            searchInput.value.trim(),
            userStatusFilterSelect.value,
            userSortBySelect.value,
            userSortDirectionSelect.value
        );
    }

    // Gắn event listener cho các control mới
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                // Khi tìm kiếm, cũng gửi các giá trị filter/sort hiện tại
                handleFilterOrSortChange();
            }, 500);
        });
    }
    if (userStatusFilterSelect) {
        userStatusFilterSelect.addEventListener('change', handleFilterOrSortChange);
    }
    if (userSortBySelect) {
        userSortBySelect.addEventListener('change', handleFilterOrSortChange);
    }
    if (userSortDirectionSelect) {
        userSortDirectionSelect.addEventListener('change', handleFilterOrSortChange);
    }

    // Initial Load
    // Tải với các giá trị filter/sort mặc định
    fetchUsers(currentUsersPage, currentUserSearchTerm, currentUserStatusFilter, currentSortBy, currentSortDirection);
});
