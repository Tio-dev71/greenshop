document.addEventListener('DOMContentLoaded', function () {
    const API_BASE_URL = window.location.origin;

    // --- Authentication Helper Functions ---
    function getAuthToken() {
        return localStorage.getItem('authToken');
    }

    function getAuthHeaders(isFormData = false) {
        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    async function logoutUserCart() {
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
    const cartItemsBody = document.getElementById('cart-items-body');
    const totalCartPriceEl = document.getElementById('total-cart-price');
    const totalUniqueItemsCountEl = document.getElementById('total-unique-items-count');
    const totalQuantityItemsCountEl = document.getElementById('total-quantity-items-count');
    const cartMessageEl = document.getElementById('cart-message');
    const cartContentWrapper = document.getElementById('cart-content-wrapper');
    const cartEmptyMessageEl = document.getElementById('cart-empty-message');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    // const checkoutNowBtn = document.getElementById('checkout-now-btn'); // Không cần lấy nút này trực tiếp nếu chỉ dùng thẻ a
    const logoutIconCart = document.getElementById('logout-icon-cart');

    if (logoutIconCart) {
        logoutIconCart.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
                logoutUserCart();
            }
        });
    }

    function displayCartMessage(message, type = 'error', duration = 3000) {
        if (cartMessageEl) {
            cartMessageEl.textContent = message;
            cartMessageEl.style.color = type === 'success' ? 'green' : 'red';
            cartMessageEl.style.padding = '10px';
            cartMessageEl.style.border = `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`;
            cartMessageEl.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
            cartMessageEl.style.borderRadius = '4px';
            if (duration > 0) {
                setTimeout(() => {
                    cartMessageEl.textContent = '';
                    cartMessageEl.style.padding = '0';
                    cartMessageEl.style.border = 'none';
                    cartMessageEl.style.backgroundColor = 'transparent';
                }, duration);
            }
        } else {
            alert(message);
        }
    }

    function formatCurrency(amount) {
        return Number(amount).toLocaleString('vi-VN') + '₫';
    }

    function showEmptyCartView(show = true) {
        if (show) {
            if (cartContentWrapper) cartContentWrapper.style.display = 'none';
            if (cartEmptyMessageEl) cartEmptyMessageEl.style.display = 'block';
        } else {
            if (cartContentWrapper) cartContentWrapper.style.display = 'block';
            if (cartEmptyMessageEl) cartEmptyMessageEl.style.display = 'none';
        }
    }

    function renderCart(cartData) {
        if (!cartItemsBody || !totalCartPriceEl || !totalUniqueItemsCountEl || !totalQuantityItemsCountEl) {
            console.error("Một hoặc nhiều DOM element của giỏ hàng không tìm thấy!");
            return;
        }

        if (!cartData || !cartData.items || cartData.items.length === 0) {
            console.log("Dữ liệu giỏ hàng rỗng hoặc không hợp lệ. Hiển thị giỏ hàng trống.");
            showEmptyCartView(true);
            totalCartPriceEl.textContent = formatCurrency(0);
            totalUniqueItemsCountEl.textContent = 0;
            totalQuantityItemsCountEl.textContent = 0;
            return;
        }

        console.log("Đang render giỏ hàng với dữ liệu:", cartData);
        showEmptyCartView(false);

        cartItemsBody.innerHTML = ''; // Xóa các mục cũ

        cartData.items.forEach(item => {
            const row = cartItemsBody.insertRow();
            row.dataset.productId = item.product_id;

            const imageUrl = item.image_url ?
                (item.image_url.startsWith('http') ? item.image_url : `${API_BASE_URL}${item.image_url.startsWith('/') ? '' : '/'}${item.image_url}`) :
                'assets/img/placeholder.png';

            const originalPrice = parseFloat(item.original_price);
            const priceAfterDiscount = parseFloat(item.price_after_discount);
            const quantityInCart = parseInt(item.quantity_in_cart);
            const subTotal = parseFloat(item.sub_total);
            const availableStock = parseInt(item.available_stock) || 99; // Mặc định max nếu không có

            row.innerHTML = `
                <td class="product-info">
                    <img src="${imageUrl}" alt="${item.product_name || 'Sản phẩm'}">
                    <span>${item.product_name || 'N/A'}</span>
                </td>
                <td>
                    ${priceAfterDiscount < originalPrice ? `<span style="text-decoration: line-through; color: #888; font-size:0.9em;">${formatCurrency(originalPrice)}</span><br>` : ''}
                    ${formatCurrency(priceAfterDiscount)}
                </td>
                <td>
                    <button class="quantity-btn quantity-decrease" data-product-id="${item.product_id}">-</button>
                    <input type="number" value="${quantityInCart}" min="0" max="${availableStock}" class="quantity-input" data-product-id="${item.product_id}" style="width: 45px; text-align: center;">
                    <button class="quantity-btn quantity-increase" data-product-id="${item.product_id}">+</button>
                </td>
                <td>${formatCurrency(subTotal)}</td>
                <td><i class="fa fa-trash remove-item-btn" data-product-id="${item.product_id}" style="cursor:pointer; color: #e74c3c;"></i></td>
            `;
        });

        totalCartPriceEl.textContent = formatCurrency(cartData.total_amount || 0);
        totalUniqueItemsCountEl.textContent = cartData.total_unique_items || 0;
        totalQuantityItemsCountEl.textContent = cartData.total_quantity_items || 0;

        addEventListenersToCartItems();
    }

    let updateTimeout = null;
    async function updateCartItemQuantity(productId, newQuantity) {
        // Nếu số lượng giảm về 0, coi như xóa sản phẩm
        if (newQuantity < 1) {
            removeItemFromCart(productId, false); // false để không confirm lại
            return;
        }

        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(async () => {
            displayCartMessage('Đang cập nhật giỏ hàng...', 'info', 0); // Hiển thị vô hạn đến khi có response
            try {
                const response = await fetch(`${API_BASE_URL}/api/cart/update/${productId}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ quantity: newQuantity })
                });
                const result = await response.json();
                if (response.ok && result.success) {
                    displayCartMessage('Cập nhật giỏ hàng thành công!', 'success');
                    renderCart(result.data);
                } else {
                    displayCartMessage(result.message || 'Lỗi cập nhật số lượng.', 'error');
                    fetchCart(); // Tải lại giỏ hàng để khôi phục trạng thái đúng nếu lỗi
                }
            } catch (error) {
                console.error('Lỗi updateCartItemQuantity:', error);
                displayCartMessage('Lỗi kết nối khi cập nhật số lượng.', 'error');
                fetchCart();
            }
        }, 700); // Tăng debounce time một chút
    }

    async function removeItemFromCart(productId, confirmUser = true) {
        if (confirmUser && !confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?')) return;

        displayCartMessage('Đang xóa sản phẩm...', 'info', 0);
        try {
            const response = await fetch(`${API_BASE_URL}/api/cart/remove/${productId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const result = await response.json();
            if (response.ok && result.success) {
                displayCartMessage('Đã xóa sản phẩm khỏi giỏ hàng.', 'success');
                renderCart(result.data);
            } else {
                displayCartMessage(result.message || 'Lỗi khi xóa sản phẩm.', 'error');
            }
        } catch (error) {
            console.error('Lỗi removeItemFromCart:', error);
            displayCartMessage('Lỗi kết nối khi xóa sản phẩm.', 'error');
        }
    }

    async function clearEntireCart() {
        if (!confirm('Bạn có chắc muốn xóa toàn bộ sản phẩm trong giỏ hàng?')) return;
        displayCartMessage('Đang xóa toàn bộ giỏ hàng...', 'info', 0);
        try {
            const response = await fetch(`${API_BASE_URL}/api/cart/clear`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const result = await response.json();
            if(response.ok && result.success) {
                displayCartMessage('Đã xóa toàn bộ giỏ hàng!', 'success');
                renderCart(result.data);
            } else {
                displayCartMessage(result.message || 'Lỗi khi xóa giỏ hàng.', 'error');
            }
        } catch (error) {
            console.error('Lỗi clearEntireCart:', error);
            displayCartMessage('Lỗi kết nối khi xóa giỏ hàng.', 'error');
        }
    }

    function addEventListenersToCartItems() {
        document.querySelectorAll('.quantity-decrease').forEach(button => {
            button.addEventListener('click', function() {
                const productId = this.dataset.productId;
                const inputEl = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);
                let currentQuantity = parseInt(inputEl.value);
                if (currentQuantity > 0) { // Cho phép giảm về 0
                    inputEl.value = currentQuantity - 1;
                    updateCartItemQuantity(productId, currentQuantity - 1);
                }
            });
        });

        document.querySelectorAll('.quantity-increase').forEach(button => {
            button.addEventListener('click', function() {
                const productId = this.dataset.productId;
                const inputEl = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);
                const maxStock = parseInt(inputEl.max);
                let currentQuantity = parseInt(inputEl.value);
                if (currentQuantity < maxStock) {
                    inputEl.value = currentQuantity + 1;
                    updateCartItemQuantity(productId, currentQuantity + 1);
                } else {
                    displayCartMessage(`Số lượng không thể vượt quá tồn kho (${maxStock}).`, 'error');
                }
            });
        });

        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', function() {
                const productId = this.dataset.productId;
                let newQuantity = parseInt(this.value);
                const minQuantity = parseInt(this.min); // là 0
                const maxStock = parseInt(this.max);

                if (isNaN(newQuantity) || newQuantity < minQuantity) {
                    newQuantity = minQuantity;
                } else if (newQuantity > maxStock) {
                    newQuantity = maxStock;
                    displayCartMessage(`Số lượng đã được điều chỉnh theo tồn kho (${maxStock}).`, 'warning');
                }
                this.value = newQuantity;
                updateCartItemQuantity(productId, newQuantity);
            });
        });

        document.querySelectorAll('.remove-item-btn').forEach(button => {
            button.addEventListener('click', function() {
                const productId = this.dataset.productId;
                removeItemFromCart(productId);
            });
        });
    }

    if(clearCartBtn) {
        clearCartBtn.addEventListener('click', clearEntireCart);
    }

    async function fetchCart() {
        const token = getAuthToken();
        if (!token) {
            displayCartMessage('Vui lòng đăng nhập để xem giỏ hàng.', 'error', 0);
            showEmptyCartView(true); // Hiển thị giỏ hàng trống và thông báo
            // Không chuyển hướng ngay, cho người dùng thấy thông báo
            return;
        }

        displayCartMessage('Đang tải giỏ hàng...', 'info', 0);
        try {
            const response = await fetch(`${API_BASE_URL}/api/cart`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (response.status === 401) {
                displayCartMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error', 0);
                setTimeout(() => logoutUserCart(), 2000);
                return;
            }
            if (!response.ok) {
                throw new Error(`Không thể tải giỏ hàng (Lỗi: ${response.status})`);
            }

            const result = await response.json();
            console.log('Cart data from API:', result); // Log dữ liệu nhận được

            if (cartMessageEl && cartMessageEl.textContent === 'Đang tải giỏ hàng...') { // Xóa message "Đang tải" nếu thành công
                cartMessageEl.textContent = '';
                cartMessageEl.style.padding = '0';
                cartMessageEl.style.border = 'none';
                cartMessageEl.style.backgroundColor = 'transparent';
            }

            if (result.success && result.data) {
                renderCart(result.data);
            } else {
                displayCartMessage(result.message || 'Lỗi khi tải giỏ hàng từ server.', 'error');
                showEmptyCartView(true);
            }
        } catch (error) {
            console.error('Lỗi fetchCart:', error);
            displayCartMessage(error.message || 'Lỗi kết nối đến máy chủ.', 'error');
            showEmptyCartView(true);
        }
    }

    // --- Khởi chạy ---
    fetchCart();
});
