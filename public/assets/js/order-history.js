document.addEventListener('DOMContentLoaded', function () {
    console.log('Order History Script Loaded.'); // Initial script load check

    const API_BASE_URL = window.location.origin;

    // --- Authentication Helper Functions ---
    function getAuthToken() {
        return localStorage.getItem('authToken');
    }

    function getAuthHeaders() {
        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    async function logoutUserOrderHistory() {
        if (getAuthToken()) {
            try {
                await fetch(`${API_BASE_URL}/api/logout`, { method: 'POST', headers: getAuthHeaders() });
            } catch (e) { console.error('Logout API call failed', e); }
        }
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        window.location.href = 'Login.html';
    }

    // --- DOM Elements ---
    const orderHistoryBody = document.getElementById('order-history-body');
    const paginationControls = document.getElementById('pagination-controls');
    const orderHistoryMessageEl = document.getElementById('order-history-message');
    const noOrdersMessageEl = document.getElementById('no-orders-message');
    const logoutIcon = document.getElementById('logout-icon-order-history');

    // Modal Elements
    const orderDetailModal = document.getElementById('orderDetailModal');
    const closeOrderDetailModalBtn = document.getElementById('closeOrderDetailModal');
    const modalOrderIdEl = document.getElementById('modal-order-id');
    const modalOrderDateEl = document.getElementById('modal-order-date');
    const modalOrderStatusEl = document.getElementById('modal-order-status');
    const modalOrderPaymentEl = document.getElementById('modal-order-payment');
    const modalShippingNameEl = document.getElementById('modal-shipping-name');
    const modalShippingPhoneEl = document.getElementById('modal-shipping-phone');
    const modalShippingAddressEl = document.getElementById('modal-shipping-address');
    const modalOrderProductsBody = document.getElementById('modal-order-products');
    const modalOrderTotalAmountEl = document.getElementById('modal-order-totalamount');
    const orderDetailMessageEl = document.getElementById('orderDetailMessage');
    const modalCancelOrderContainer = document.getElementById('modal-cancel-order-container');

    let currentPage = 1; // To track current page for list refresh

    if (!orderHistoryBody || !paginationControls || !orderHistoryMessageEl || !noOrdersMessageEl || !orderDetailModal) {
        console.error("CRITICAL: One or more essential DOM elements for Order History page are missing!");
        if(document.body) document.body.innerHTML = "<p style='color:red; text-align:center; font-size:18px; margin-top:50px;'>Lỗi nghiêm trọng: Không thể tải trang lịch sử đơn hàng do thiếu các thành phần HTML cơ bản. Vui lòng liên hệ quản trị viên.</p>";
        return; // Stop script execution if essential elements are missing
    }


    if (logoutIcon) {
        logoutIcon.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
                logoutUserOrderHistory();
            }
        });
    }

    function displayMessage(element, message, type = 'error', duration = 4000) {
        if (element) {
            element.textContent = message;
            element.className = 'message-area'; // Reset
            element.classList.add(type === 'success' ? 'success-message' : 'error-message');
            // Apply specific styles consistent with User-info.css
            element.style.color = type === 'success' ? '#155724' : '#721c24';
            element.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
            element.style.border = `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`;
            element.style.padding = '8px';
            element.style.borderRadius = '4px';
            element.style.textAlign = 'center';
            element.style.marginBottom = '15px';


            if (duration > 0) {
                setTimeout(() => {
                    clearMessage(element);
                }, duration);
            }
        } else {
            console.warn("Attempted to display message on a null element:", message);
            // alert(message); // Fallback alert if element is crucial but missing
        }
    }

    function clearMessage(element) {
        if (element) {
            element.textContent = '';
            element.className = 'message-area';
            element.style.padding = '0';
            element.style.border = 'none';
            element.style.backgroundColor = 'transparent';
            element.style.marginBottom = '0';
        }
    }


    function formatCurrency(amount) {
        try {
            return Number(amount).toLocaleString('vi-VN') + '₫';
        } catch (e) {
            console.error("Error formatting currency:", amount, e);
            return 'N/A';
        }
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
        try {
            return new Date(dateString).toLocaleString('vi-VN', options);
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return dateString;
        }
    }

    function getStatusClass(status) {
        const statusLower = status ? String(status).toLowerCase() : 'unknown';
        switch (statusLower) {
            case 'delivered': case 'completed': return 'status-success';
            case 'shipped': return 'status-shipped';
            case 'processing': return 'status-processing';
            case 'pending': return 'status-pending';
            case 'cancelled': case 'failed': return 'status-cancelled';
            default: return 'status-unknown';
        }
    }

    function translateStatus(status) {
        const statusLower = status ? String(status).toLowerCase() : 'không xác định';
        const translations = {
            'pending': 'Chờ xác nhận', 'processing': 'Đang xử lý',
            'shipped': 'Đang giao', 'delivered': 'Đã giao',
            'completed': 'Hoàn thành', 'cancelled': 'Đã hủy',
            'failed': 'Thất bại'
        };
        return translations[statusLower] || status;
    }

    function openOrderDetailModal() {
        if (orderDetailModal) orderDetailModal.style.display = 'flex';
        clearMessage(orderDetailMessageEl);
    }

    function closeOrderDetailModal() {
        if (orderDetailModal) orderDetailModal.style.display = 'none';
        if (modalOrderProductsBody) modalOrderProductsBody.innerHTML = '';
        if (modalCancelOrderContainer) modalCancelOrderContainer.innerHTML = '';
    }

    if (closeOrderDetailModalBtn) {
        closeOrderDetailModalBtn.addEventListener('click', closeOrderDetailModal);
    }
    window.addEventListener('click', (event) => {
        if (event.target === orderDetailModal) {
            closeOrderDetailModal();
        }
    });


    async function fetchAndDisplayOrderDetails(orderId) {
        console.log(`Workspaceing details for order ID: ${orderId}`);
        openOrderDetailModal();
        if (modalOrderProductsBody) modalOrderProductsBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Đang tải chi tiết đơn hàng...</td></tr>`;
        clearMessage(orderDetailMessageEl);
        if (modalCancelOrderContainer) modalCancelOrderContainer.innerHTML = '';


        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
                headers: getAuthHeaders()
            });

            const responseText = await response.text(); // Get text first for debugging
            console.log(`Response for order ${orderId} details:`, response.status, responseText);


            if (!response.ok) {
                if (response.status === 401) {
                    displayMessage(orderDetailMessageEl, 'Phiên đăng nhập hết hạn. Đang đăng xuất...', 'error', 0);
                    logoutUserOrderHistory();
                    return;
                }
                let errData;
                try { errData = JSON.parse(responseText); } catch (e) { errData = { message: responseText || `Lỗi ${response.status}` };}
                throw new Error(errData.message || `Lỗi ${response.status} khi tải chi tiết đơn hàng.`);
            }

            const result = JSON.parse(responseText);
            if (result.success && result.data) {
                renderOrderDetailModal(result.data);
            } else {
                throw new Error(result.message || 'Không thể tải dữ liệu chi tiết đơn hàng.');
            }
        } catch (error) {
            console.error('Lỗi fetchAndDisplayOrderDetails:', error);
            if (modalOrderProductsBody) modalOrderProductsBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">${error.message}</td></tr>`;
            displayMessage(orderDetailMessageEl, error.message, 'error');
        }
    }

    function renderOrderDetailModal(order) {
        console.log("Rendering modal for order:", order);
        if (!order) {
            console.error("renderOrderDetailModal called with null order.");
            return;
        }

        if (modalOrderIdEl) modalOrderIdEl.textContent = `Chi tiết Đơn hàng #${order.OrderID}`;
        if (modalOrderDateEl) modalOrderDateEl.textContent = formatDate(order.created_at);
        if (modalOrderStatusEl) {
            modalOrderStatusEl.textContent = translateStatus(order.Status);
            modalOrderStatusEl.className = `status-badge ${getStatusClass(order.Status)}`;
        }
        if (modalOrderPaymentEl) modalOrderPaymentEl.textContent = order.Payment === 'COD' ? 'Thanh toán khi nhận hàng' : (order.Payment === 'OnlineBanking' ? 'Chuyển khoản/Online' : order.Payment);


        if (order.address) {
            if (modalShippingNameEl) modalShippingNameEl.textContent = order.address.CustomerName || 'N/A';
            if (modalShippingPhoneEl) modalShippingPhoneEl.textContent = order.address.PhoneNumber || 'N/A';
            if (modalShippingAddressEl) modalShippingAddressEl.textContent = `${order.address.Street || ''}, ${order.address.Ward || ''}, ${order.address.District || ''}`;
        } else {
            console.warn("Order address is missing for order:", order.OrderID);
            if (modalShippingNameEl) modalShippingNameEl.textContent = 'Không có thông tin';
        }

        if (modalOrderProductsBody) {
            modalOrderProductsBody.innerHTML = '';
            if (order.products && order.products.length > 0) {
                order.products.forEach(product => {
                    const productRow = modalOrderProductsBody.insertRow();
                    const imageUrl = product.Image ?
                        (String(product.Image).startsWith('http') ? product.Image : `${API_BASE_URL}/storage/${product.Image}`) :
                        'assets/img/placeholder.png'; // Ensure this placeholder exists
                    const pricePaid = parseFloat(product.pivot && product.pivot.Price !== undefined ? product.pivot.Price : (product.Price || 0));
                    const quantity = parseInt(product.pivot && product.pivot.Quantity !== undefined ? product.pivot.Quantity : 0);
                    const subtotal = pricePaid * quantity;

                    productRow.innerHTML = `
                        <td>
                            <div class="product-item-info">
                                <img src="${imageUrl}" alt="${product.ProductName || 'Sản phẩm'}">
                                <span style="margin-left:10px;">${product.ProductName || 'N/A'}</span>
                            </div>
                        </td>
                        <td style="text-align:right;">${formatCurrency(pricePaid)}</td>
                        <td style="text-align:center;">${quantity}</td>
                        <td style="text-align:right;">${formatCurrency(subtotal)}</td>
                    `;
                });
            } else {
                modalOrderProductsBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Không có sản phẩm trong đơn hàng này.</td></tr>`;
            }
        }

        if (modalOrderTotalAmountEl) modalOrderTotalAmountEl.textContent = formatCurrency(order.TotalAmount);

        if (modalCancelOrderContainer) {
            modalCancelOrderContainer.innerHTML = '';
            const cancellableStatuses = ['pending', 'processing'];
            if (order.Status && cancellableStatuses.includes(String(order.Status).toLowerCase())) {
                const cancelButton = document.createElement('button');
                cancelButton.textContent = 'Hủy đơn hàng';
                cancelButton.className = 'btn-cancel-order'; // Add a class for styling
                // Apply styles similar to User-info.css buttons or define new ones
                cancelButton.style.padding = '10px 20px';
                cancelButton.style.fontSize = '16px';
                cancelButton.style.fontWeight = '500';
                cancelButton.style.color = 'white';
                cancelButton.style.backgroundColor = '#dc3545'; // Red color for cancel
                cancelButton.style.borderRadius = '5px';
                cancelButton.style.cursor = 'pointer';
                cancelButton.style.border = 'none';

                cancelButton.onclick = () => handleCancelOrder(order.OrderID);
                modalCancelOrderContainer.appendChild(cancelButton);
            }
        }
    }

    async function handleCancelOrder(orderId) {
        if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này không? Hành động này không thể hoàn tác.')) {
            return;
        }
        displayMessage(orderDetailMessageEl, 'Đang xử lý hủy đơn hàng...', 'info', 0); // Use modal's message area
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            const result = await response.json();

            if (response.ok && result.success) {
                displayMessage(orderDetailMessageEl, 'Đơn hàng đã được hủy thành công!', 'success');
                if (result.data) {
                    renderOrderDetailModal(result.data); // Update modal with new status
                }
                fetchOrderHistory(currentPage); // Refresh the list in the background
            } else {
                displayMessage(orderDetailMessageEl, result.message || 'Không thể hủy đơn hàng.', 'error');
            }
        } catch (error) {
            console.error("Lỗi khi hủy đơn hàng:", error);
            displayMessage(orderDetailMessageEl, 'Lỗi kết nối khi hủy đơn hàng: ' + error.message, 'error');
        }
    }


    async function fetchOrderHistory(page = 1) {
        console.log(`Workspaceing order history for page: ${page}`);
        currentPage = page; // Update global current page

        const token = getAuthToken();
        if (!token) {
            displayMessage(orderHistoryMessageEl, 'Vui lòng đăng nhập để xem lịch sử đơn hàng.', 'error', 0);
            if (noOrdersMessageEl) noOrdersMessageEl.style.display = 'block';
            if (orderHistoryBody) orderHistoryBody.innerHTML = '';
            return;
        }

        if (orderHistoryBody) orderHistoryBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Đang tải lịch sử đơn hàng...</td></tr>`;
        if (noOrdersMessageEl) noOrdersMessageEl.style.display = 'none';
        clearMessage(orderHistoryMessageEl);

        try {
            const response = await fetch(`${API_BASE_URL}/api/orders?page=${page}`, {
                headers: getAuthHeaders()
            });

            const responseText = await response.text(); // Get text for debugging
            console.log(`Response for order history (page ${page}):`, response.status, responseText);

            if (response.status === 401) {
                displayMessage(orderHistoryMessageEl, 'Phiên đăng nhập đã hết hạn. Đang đăng xuất...', 'error', 0);
                logoutUserOrderHistory();
                return;
            }
            if (!response.ok) {
                let errorDetail = responseText;
                try {
                    const jsonError = JSON.parse(responseText);
                    errorDetail = jsonError.message || responseText;
                } catch(e) { /* ignore if not json */ }
                throw new Error(`Không thể tải lịch sử đơn hàng (Lỗi: ${response.status} - ${errorDetail})`);
            }

            const result = JSON.parse(responseText);
            if (result.success && result.data && result.data.data) {
                renderOrderHistory(result.data.data);
                renderPagination(result.data);
                if (result.data.data.length === 0 && page === 1) {
                    if (noOrdersMessageEl) noOrdersMessageEl.style.display = 'block';
                    if (orderHistoryBody) orderHistoryBody.innerHTML = '';
                } else {
                    if (noOrdersMessageEl) noOrdersMessageEl.style.display = 'none';
                }
            } else {
                const errorMsg = result.message || 'Lỗi khi tải lịch sử đơn hàng từ server.';
                if (orderHistoryBody) orderHistoryBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:orange;">${errorMsg}</td></tr>`;
                displayMessage(orderHistoryMessageEl, errorMsg, 'error');
                if (noOrdersMessageEl) noOrdersMessageEl.style.display = 'block';
            }
        } catch (error) {
            console.error('Lỗi fetchOrderHistory:', error);
            if (orderHistoryBody) orderHistoryBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Lỗi khi tải dữ liệu: ${error.message}</td></tr>`;
            displayMessage(orderHistoryMessageEl, `Lỗi tải lịch sử: ${error.message}`, 'error');
            if (noOrdersMessageEl) noOrdersMessageEl.style.display = 'block';
        }
    }

    function renderOrderHistory(orders) {
        console.log("Rendering order history list:", orders);
        if (!orderHistoryBody) {
            console.error("orderHistoryBody is null in renderOrderHistory");
            return;
        }
        orderHistoryBody.innerHTML = '';

        if (!orders || orders.length === 0) {
            if (noOrdersMessageEl) noOrdersMessageEl.style.display = 'block';
            return;
        }
        if (noOrdersMessageEl) noOrdersMessageEl.style.display = 'none';


        orders.forEach(order => {
            const row = orderHistoryBody.insertRow();
            let totalItems = 0;
            // The OrderController@index provides 'products:ProductID,ProductName,Image'
            // This means `order.products` is an array of product objects.
            // For the list view, `totalItems` will be the count of distinct product types.
            if (order.products && Array.isArray(order.products)) {
                totalItems = order.products.length;
            }

            row.innerHTML = `
                <td>#${order.OrderID || 'N/A'}</td>
                <td>${formatDate(order.created_at)}</td>
                <td>${totalItems}</td>
                <td>${formatCurrency(order.TotalAmount)}</td>
                <td class="${getStatusClass(order.Status)}">${translateStatus(order.Status)}</td>
                <td><button class="order-link-btn" data-order-id="${order.OrderID}">Xem chi tiết</button></td>
            `;
        });

        document.querySelectorAll('.order-link-btn').forEach(button => {
            button.addEventListener('click', function() {
                const orderId = this.dataset.orderId;
                if(orderId) {
                    fetchAndDisplayOrderDetails(orderId);
                } else {
                    console.error("Order ID is missing on 'Xem chi tiết' button.");
                }
            });
        });
    }

    function renderPagination(paginationData) {
        if (!paginationControls) {
            console.error("paginationControls is null in renderPagination");
            return;
        }
        paginationControls.innerHTML = '';

        if (!paginationData || !paginationData.links || paginationData.last_page <= 1) {
            return;
        }

        paginationData.links.forEach(link => {
            const pageButton = document.createElement("button");
            let label = link.label;
            if (label.includes('Previous')) label = '&laquo; Trước';
            else if (label.includes('Next')) label = 'Sau &raquo;';
            else label = link.label; // Keep numbers as is

            pageButton.innerHTML = label;
            pageButton.disabled = !link.url;
            if (link.active) {
                pageButton.classList.add("active");
            }

            pageButton.addEventListener("click", (e) => {
                e.preventDefault();
                if (link.url) {
                    try {
                        const urlParams = new URL(link.url).searchParams;
                        const pageNumber = parseInt(urlParams.get('page'));
                        if (!isNaN(pageNumber)) {
                            fetchOrderHistory(pageNumber);
                        } else {
                            console.warn("Could not parse page number from URL:", link.url);
                        }
                    } catch (error) {
                        console.error("Lỗi xử lý URL phân trang:", error, link.url);
                    }
                }
            });
            paginationControls.appendChild(pageButton);
        });
    }

    // --- Khởi chạy ---
    const token = getAuthToken();
    if (!token) {
        displayMessage(orderHistoryMessageEl, 'Vui lòng đăng nhập để xem lịch sử đơn hàng.', 'error', 0);
        if (noOrdersMessageEl) noOrdersMessageEl.style.display = 'block';
        if (orderHistoryBody) orderHistoryBody.innerHTML = '';
        // Consider redirecting or disabling functionality further
    } else {
        fetchOrderHistory(1); // Tải trang đầu tiên
    }
});
