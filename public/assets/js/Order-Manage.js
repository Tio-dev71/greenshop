document.addEventListener("DOMContentLoaded", function() {
    const API_BASE_URL = window.location.origin;
    const orderTableBody = document.getElementById("order-table-body");
    const searchInput = document.getElementById("order-search-input");
    const statusFilterSelect = document.getElementById("status-filter-select");
    const paginationControls = document.getElementById('pagination-controls');
    const adminLogoutButton = document.getElementById('admin-logout-button');
    const adminNameDisplay = document.getElementById('admin-name-display');
    const orderManagerMessageEl = document.getElementById('order-manager-message');

    // Modal elements
    const orderDetailModal = document.getElementById("orderDetailModal");
    const closeModalButton = document.getElementById("closeOrderDetailModal");
    const modalTitleOrderIdDisplay = document.getElementById("modal-order-id-display");
    const modalDetailOrderId = document.getElementById("modal-detail-order-id");
    const modalDetailOrderDate = document.getElementById("modal-detail-order-date");
    const modalDetailOrderStatus = document.getElementById("modal-detail-order-status");
    const modalDetailPaymentMethod = document.getElementById("modal-detail-payment-method");
    const modalDetailCustomerName = document.getElementById("modal-detail-customer-name");
    const modalDetailCustomerEmail = document.getElementById("modal-detail-customer-email");
    const modalDetailCustomerPhone = document.getElementById("modal-detail-customer-phone");
    const modalDetailShippingAddress = document.getElementById("modal-detail-shipping-address");
    const modalDetailProductsTbody = document.getElementById("modal-detail-products-tbody");
    const modalDetailTotalAmount = document.getElementById("modal-detail-total-amount");
    const modalStatusSelect = document.getElementById("modal-status-select");
    const modalUpdateStatusBtn = document.getElementById("modal-update-status-btn");
    const modalCurrentOrderIdHidden = document.getElementById("modal-current-order-id-hidden");
    const modalMessageArea = document.getElementById("modal-message-area");


    let currentOrdersPage = 1;
    let currentSearchTerm = '';
    let currentStatusFilter = '';
    // Add sort variables if needed

    // --- Authentication & Admin Info --- (Copy từ user-manage.js)
    function getAuthToken() { return localStorage.getItem('authToken'); }
    function getAuthHeaders() {
        const token = getAuthToken();
        const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    }
    function getAuthUser() {
        const userString = localStorage.getItem('authUser');
        if (userString) { try { return JSON.parse(userString); } catch (e) { return null; } }
        return null;
    }
    const currentAdminUser = getAuthUser();
    if (currentAdminUser && adminNameDisplay) {
        adminNameDisplay.textContent = `Chào, ${currentAdminUser.name}`;
    }
    if (adminLogoutButton) {
        adminLogoutButton.addEventListener('click', async function(event) {
            event.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
                if (getAuthToken()) { try { await fetch(`${API_BASE_URL}/api/logout`, { method: 'POST', headers: getAuthHeaders() }); } catch (e) {} }
                localStorage.removeItem('authToken'); localStorage.removeItem('authUser');
                window.location.href = 'Login.html';
            }
        });
    }

    function displayMessage(element, message, type = 'error', duration = 4000) {
        if (element) {
            element.textContent = message;
            element.className = 'message-area'; // Reset
            element.classList.add(type === 'success' ? 'success-message' : 'error-message');
            // Style for message area from User-Manage.css
            element.style.color = type === 'success' ? '#155724' : '#721c24';
            element.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
            element.style.border = `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`;
            element.style.padding = '8px';
            element.style.borderRadius = '4px';
            element.style.textAlign = 'center';

            element.style.display = 'block';
            if (duration > 0) {
                setTimeout(() => {
                    element.textContent = '';
                    element.style.display = 'none';
                }, duration);
            }
        }
    }

    function formatCurrency(amount) {
        return Number(amount).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) { return 'N/A'; }
    }

    function translateOrderStatus(statusKey) {
        const statuses = {
            'pending': 'Chờ xác nhận',
            'processing': 'Đang xử lý',
            'shipped': 'Đang giao',
            'delivered': 'Đã giao',
            'cancelled': 'Đã hủy',
            'failed': 'Thất bại',
            'all': 'Tất cả' // For filter display
        };
        return statuses[String(statusKey).toLowerCase()] || statusKey;
    }
    function getStatusClass(statusKey) { // For styling the status text
        return String(statusKey).toLowerCase();
    }


    async function fetchOrders(page = 1, searchTerm = '', status = '') {
        currentOrdersPage = page;
        currentSearchTerm = searchTerm;
        currentStatusFilter = status;

        let url = `${API_BASE_URL}/api/admin/orders?page=${page}`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
        if (status) url += `&status=${status}`;
        // Add sorting params if implemented: &sort_by=X&sort_direction=Y

        orderTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Đang tải danh sách đơn hàng...</td></tr>`;

        try {
            const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
            if (!response.ok) {
                if (response.status === 401) { /* ... handle logout ... */ window.location.href = 'Login.html'; return; }
                const err = await response.json();
                throw new Error(err.message || `Lỗi ${response.status}`);
            }
            const result = await response.json();
            if (result.success && result.data) {
                renderOrders(result.data.data);
                renderPagination(result.data);
            } else {
                orderTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">${result.message || 'Không tải được đơn hàng.'}</td></tr>`;
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
            orderTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Lỗi: ${error.message}</td></tr>`;
        }
    }

    function renderOrders(orders) {
        orderTableBody.innerHTML = "";
        if (!orders || orders.length === 0) {
            orderTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Không có đơn hàng nào phù hợp.</td></tr>`;
            return;
        }
        orders.forEach(order => {
            const row = orderTableBody.insertRow();
            // API: OrderID, user (name, email), created_at, TotalAmount, Status
            row.innerHTML = `
                <td>#${order.OrderID}</td>
                <td>${order.user ? order.user.name : (order.address ? order.address.CustomerName : 'N/A')}</td>
                <td>${order.user ? order.user.email : 'N/A'}</td>
                <td>${formatDate(order.created_at)}</td>
                <td>${formatCurrency(order.TotalAmount)}</td>
                <td><span class="status ${getStatusClass(order.Status)}">${translateOrderStatus(order.Status)}</span></td>
                <td class="action">
                    <button class="view-btn" data-order-id="${order.OrderID}">Xem</button>
                </td>
            `;
        });
        addOrderActionListeners();
    }

    function renderPagination(paginationData) {
        // ... (Copy pagination logic from user-manage.js, ensuring it calls fetchOrders)
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
                pageButton.style.fontWeight = 'bold';
                pageButton.style.backgroundColor = '#CDF96E';
            }
            if (link.url) {
                pageButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    try {
                        const pageNumber = new URL(link.url).searchParams.get('page');
                        if (pageNumber) fetchOrders(pageNumber, currentSearchTerm, currentStatusFilter);
                    } catch (error) { console.error("Pagination URL error:", error); }
                });
            } else if (label === "...") {
                pageButton.disabled = true;
            }
            paginationControls.appendChild(pageButton);
        });
    }

    function addOrderActionListeners() {
        document.querySelectorAll('.view-btn').forEach(button => {
            button.addEventListener('click', function() {
                const orderId = this.dataset.orderId;
                fetchAndShowOrderDetail(orderId);
            });
        });
    }

    async function fetchAndShowOrderDetail(orderId) {
        displayMessage(modalMessageArea, '', 'info', 0); // Clear previous modal messages
        // Populate modal with "loading..."
        modalTitleOrderIdDisplay.textContent = orderId;
        modalDetailProductsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Đang tải chi tiết...</td></tr>`;
        modalCurrentOrderIdHidden.value = orderId;


        orderDetailModal.style.display = "flex";

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}`, { headers: getAuthHeaders() });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || `Lỗi ${response.status}`);
            }
            const result = await response.json();
            if (result.success && result.data) {
                populateOrderDetailModal(result.data);
            } else {
                throw new Error(result.message || "Không thể tải chi tiết đơn hàng.");
            }
        } catch (error) {
            console.error("Error fetching order detail:", error);
            modalDetailProductsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">${error.message}</td></tr>`;
            displayMessage(modalMessageArea, error.message, 'error');
        }
    }

    function populateOrderDetailModal(order) {
        modalDetailOrderId.textContent = `#${order.OrderID}`;
        modalDetailOrderDate.textContent = formatDate(order.created_at);
        modalDetailOrderStatus.textContent = translateOrderStatus(order.Status);
        modalDetailOrderStatus.className = `status ${getStatusClass(order.Status)}`;
        modalDetailPaymentMethod.textContent = order.Payment === 'COD' ? 'Thanh toán khi nhận hàng' : (order.Payment === 'OnlineBanking' ? 'Chuyển khoản/Online' : order.Payment);

        modalDetailCustomerName.textContent = order.user ? order.user.name : (order.address ? order.address.CustomerName : 'N/A');
        modalDetailCustomerEmail.textContent = order.user ? order.user.email : 'N/A';
        modalDetailCustomerPhone.textContent = order.user ? (order.user.PhoneNumber || (order.address ? order.address.PhoneNumber : 'N/A')) : (order.address ? order.address.PhoneNumber : 'N/A');
        modalDetailShippingAddress.textContent = order.address ? `${order.address.Street}, ${order.address.Ward}, ${order.address.District}` : 'N/A';

        modalDetailProductsTbody.innerHTML = '';
        if (order.products && order.products.length > 0) {
            order.products.forEach(p => {
                const row = modalDetailProductsTbody.insertRow();
                const imageUrl = p.Image ? (String(p.Image).startsWith('http') ? p.Image : `${API_BASE_URL}/storage/${p.Image}`) : 'assets/img/placeholder.png';
                const priceAtOrder = parseFloat(p.pivot.Price);
                const discountAtOrder = parseFloat(p.pivot.Discount); // This is percentage e.g. 0.1 for 10%
                const quantity = parseInt(p.pivot.Quantity);
                const effectivePrice = priceAtOrder * (1 - discountAtOrder);
                const subTotal = effectivePrice * quantity;

                row.innerHTML = `
                    <td class="product-info">
                        <img src="${imageUrl}" alt="${p.ProductName}">
                        <div>${p.ProductName}</div>
                    </td>
                    <td>${formatCurrency(priceAtOrder)}</td>
                    <td>${quantity}</td>
                    <td>${(discountAtOrder * 100).toFixed(0)}%</td>
                    <td>${formatCurrency(subTotal)}</td>
                `;
            });
        } else {
            modalDetailProductsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Không có sản phẩm.</td></tr>`;
        }
        modalDetailTotalAmount.textContent = formatCurrency(order.TotalAmount);
        modalStatusSelect.value = String(order.Status).toLowerCase();
    }

    // Modal close listeners
    if (closeModalButton) {
        closeModalButton.addEventListener("click", function() {
            orderDetailModal.style.display = "none";
        });
    }
    window.addEventListener("click", function(event) {
        if (event.target === orderDetailModal) {
            orderDetailModal.style.display = "none";
        }
    });

    // Update order status from modal
    if (modalUpdateStatusBtn) {
        modalUpdateStatusBtn.addEventListener('click', async function() {
            const orderId = modalCurrentOrderIdHidden.value;
            const newStatus = modalStatusSelect.value;
            if (!orderId || !newStatus) {
                displayMessage(modalMessageArea, "Thông tin không hợp lệ để cập nhật.", 'error');
                return;
            }

            if (!confirm(`Bạn có chắc muốn cập nhật trạng thái đơn hàng #${orderId} thành "${translateOrderStatus(newStatus)}"?`)) {
                return;
            }
            displayMessage(modalMessageArea, "Đang cập nhật...", 'info', 0);


            try {
                const response = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}/status`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ status: newStatus })
                });
                const result = await response.json();
                if (response.ok && result.success) {
                    displayMessage(modalMessageArea, "Cập nhật trạng thái thành công!", 'success');
                    // Update status in modal display
                    modalDetailOrderStatus.textContent = translateOrderStatus(result.data.Status);
                    modalDetailOrderStatus.className = `status ${getStatusClass(result.data.Status)}`;
                    modalStatusSelect.value = String(result.data.Status).toLowerCase();
                    // Refresh the main order list
                    fetchOrders(currentOrdersPage, currentSearchTerm, currentStatusFilter);
                } else {
                    displayMessage(modalMessageArea, `Lỗi: ${result.message || 'Cập nhật thất bại.'}`, 'error');
                }
            } catch (error) {
                console.error("Error updating order status:", error);
                displayMessage(modalMessageArea, `Lỗi kết nối: ${error.message}`, 'error');
            }
        });
    }

    // Filter listeners
    if (searchInput) {
        let searchDebounceTimer;
        searchInput.addEventListener("input", () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                fetchOrders(1, searchInput.value.trim(), currentStatusFilter);
            }, 500);
        });
    }
    if (statusFilterSelect) {
        statusFilterSelect.addEventListener("change", () => {
            fetchOrders(1, currentSearchTerm, statusFilterSelect.value);
        });
    }

    // Initial Load
    fetchOrders();
});
