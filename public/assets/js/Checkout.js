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
    async function logoutUserCheckout() {
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
    const logoutIconCheckout = document.getElementById('logout-icon-checkout');
    const checkoutMessageEl = document.getElementById('checkout-message');

    const userAddressesSelect = document.getElementById('user-addresses');
    const shippingForm = document.getElementById('shipping-form');
    const customerNameInput = document.getElementById('customerName');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const streetInput = document.getElementById('street');
    const wardInput = document.getElementById('ward');
    const districtInput = document.getElementById('district');

    const orderItemsSummaryDiv = document.getElementById('order-items-summary');
    const summarySubtotalEl = document.getElementById('summary-subtotal');
    const summaryTotalEl = document.getElementById('summary-total');

    const placeOrderBtn = document.getElementById('place-order-btn');

    // --- DOM Elements for Bank Transfer Info ---
    const codRadio = document.getElementById('cod');
    const onlineBankingRadio = document.getElementById('onlinebanking');
    const bankTransferInfoDiv = document.getElementById('bank-transfer-info');

    let currentCartData = null;
    let userSavedAddresses = [];
    let selectedAddressId = null;

    if (logoutIconCheckout) {
        logoutIconCheckout.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
                logoutUserCheckout();
            }
        });
    }

    function displayCheckoutMessage(message, type = 'error', duration = 4000) {
        if (checkoutMessageEl) {
            checkoutMessageEl.textContent = message;
            checkoutMessageEl.className = 'checkout-message';
            checkoutMessageEl.classList.add(type === 'success' ? 'success-message' : 'error-message');
            checkoutMessageEl.style.color = type === 'success' ? 'green' : 'red';
            checkoutMessageEl.style.padding = '10px';
            checkoutMessageEl.style.border = `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`;
            checkoutMessageEl.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
            checkoutMessageEl.style.display = 'block';

            if (duration > 0) {
                setTimeout(() => {
                    if (checkoutMessageEl) {
                        checkoutMessageEl.textContent = '';
                        checkoutMessageEl.style.padding = '0';
                        checkoutMessageEl.style.border = 'none';
                        checkoutMessageEl.style.backgroundColor = 'transparent';
                        checkoutMessageEl.style.display = 'none';
                    }
                }, duration);
            }
        } else {
            alert(message);
        }
    }

    function formatCurrency(amount) {
        return Number(amount).toLocaleString('vi-VN') + '₫';
    }

    async function fetchUserAddresses() {
        if (!userAddressesSelect) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/user/addresses`, {
                headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error('Không thể tải danh sách địa chỉ.');
            const result = await response.json();
            if (result.success && result.data) {
                userSavedAddresses = result.data;
                populateAddressDropdown(result.data);
            }
        } catch (error) {
            console.error("Lỗi tải địa chỉ:", error);
        }
    }

    function populateAddressDropdown(addresses) {
        if (!userAddressesSelect) return;
        while (userAddressesSelect.options.length > 2) {
            userAddressesSelect.remove(1);
        }
        addresses.forEach(addr => {
            const option = document.createElement('option');
            option.value = addr.AddressID;
            option.textContent = `${addr.CustomerName} - ${addr.Street}, ${addr.Ward}, ${addr.District} (${addr.PhoneNumber})`;
            userAddressesSelect.insertBefore(option, userAddressesSelect.options[userAddressesSelect.options.length -1]);
        });
    }

    if (userAddressesSelect) {
        userAddressesSelect.addEventListener('change', function() {
            const selectedValue = this.value;
            selectedAddressId = null;
            if (selectedValue && selectedValue !== "new" && selectedValue !== "") {
                const selectedAddr = userSavedAddresses.find(addr => addr.AddressID == selectedValue);
                if (selectedAddr) {
                    selectedAddressId = selectedAddr.AddressID;
                    if(customerNameInput) customerNameInput.value = selectedAddr.CustomerName;
                    if(phoneNumberInput) phoneNumberInput.value = selectedAddr.PhoneNumber;
                    if(streetInput) streetInput.value = selectedAddr.Street;
                    if(wardInput) wardInput.value = selectedAddr.Ward;
                    if(districtInput) districtInput.value = selectedAddr.District;
                    setAddressFieldsDisabled(true);
                }
            } else if (selectedValue === "new") {
                if(shippingForm) shippingForm.reset();
                setAddressFieldsDisabled(false);
            } else {
                if(shippingForm) shippingForm.reset();
                setAddressFieldsDisabled(false);
            }
        });
    }

    function setAddressFieldsDisabled(disabled) {
        if(customerNameInput) customerNameInput.disabled = disabled;
        if(phoneNumberInput) phoneNumberInput.disabled = disabled;
        if(streetInput) streetInput.disabled = disabled;
        if(wardInput) wardInput.disabled = disabled;
        if(districtInput) districtInput.disabled = disabled;
    }

    async function fetchCartSummary() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/cart`, {
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                if (response.status === 401) {
                    displayCheckoutMessage("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.", 'error', 0);
                    setTimeout(() => logoutUserCheckout(), 2000);
                } else {
                    throw new Error('Không thể tải thông tin giỏ hàng cho thanh toán.');
                }
                return;
            }
            const result = await response.json();
            if (result.success && result.data) {
                currentCartData = result.data;
                if (!currentCartData.items || currentCartData.items.length === 0) {
                    displayCheckoutMessage("Giỏ hàng của bạn trống. Không thể thanh toán.", 'error', 0);
                    if(placeOrderBtn) placeOrderBtn.disabled = true;
                    setTimeout(() => { window.location.href = 'Cart.html'; }, 3000);
                    return;
                }
                renderOrderSummary(currentCartData);
            } else {
                displayCheckoutMessage(result.message || 'Lỗi tải tóm tắt giỏ hàng.', 'error');
            }
        } catch (error) {
            console.error("Lỗi fetchCartSummary:", error);
            displayCheckoutMessage(error.message, 'error');
        }
    }

    function renderOrderSummary(cartData) {
        if (!orderItemsSummaryDiv || !summarySubtotalEl || !summaryTotalEl) return;
        orderItemsSummaryDiv.innerHTML = '';
        cartData.items.forEach(item => {
            const imageUrl = item.image_url || 'assets/img/placeholder.png';
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('order-item');
            itemDiv.innerHTML = `
                <div class="item-info">
                    <img src="${imageUrl}" alt="${item.product_name}">
                    <div class="item-details">
                        <span class="item-name">${item.product_name}</span>
                        <span class="item-quantity">x ${item.quantity_in_cart}</span>
                    </div>
                </div>
                <span class="item-price">${formatCurrency(item.sub_total)}</span>
            `;
            orderItemsSummaryDiv.appendChild(itemDiv);
        });
        if(summarySubtotalEl) summarySubtotalEl.textContent = formatCurrency(cartData.total_amount);
        if(summaryTotalEl) summaryTotalEl.textContent = formatCurrency(cartData.total_amount);
    }

    // --- Xử lý đặt hàng ---
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', async function() {
            displayCheckoutMessage('', '', 0);
            let addressPayload = {};
            let addressIdToSubmit = selectedAddressId;

            if (!addressIdToSubmit) {
                addressPayload = {
                    CustomerName: customerNameInput ? customerNameInput.value.trim() : '',
                    PhoneNumber: phoneNumberInput ? phoneNumberInput.value.trim() : '',
                    Street: streetInput ? streetInput.value.trim() : '',
                    Ward: wardInput ? wardInput.value.trim() : '',
                    District: districtInput ? districtInput.value.trim() : '',
                };
                if (!addressPayload.CustomerName || !addressPayload.PhoneNumber || !addressPayload.Street || !addressPayload.Ward || !addressPayload.District) {
                    displayCheckoutMessage('Vui lòng điền đầy đủ thông tin địa chỉ giao hàng mới.', 'error');
                    return;
                }
                try {
                    const addrResponse = await fetch(`${API_BASE_URL}/api/user/addresses`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify(addressPayload)
                    });
                    const addrResult = await addrResponse.json();
                    if (addrResponse.ok && addrResult.success && addrResult.data.AddressID) {
                        addressIdToSubmit = addrResult.data.AddressID;
                        displayCheckoutMessage('Đã lưu địa chỉ mới.', 'success', 2000);
                        await fetchUserAddresses();
                        if(userAddressesSelect) userAddressesSelect.value = addressIdToSubmit;
                        setAddressFieldsDisabled(true);
                    } else {
                        let errorMsg = addrResult.message || "Không thể lưu địa chỉ mới.";
                        if(addrResult.errors) {
                            for(const field in addrResult.errors) errorMsg += `\n${addrResult.errors[field].join(', ')}`;
                        }
                        displayCheckoutMessage(errorMsg, 'error');
                        return;
                    }
                } catch (error) {
                    displayCheckoutMessage("Lỗi khi lưu địa chỉ mới: " + error.message, 'error');
                    return;
                }
            }

            if (!addressIdToSubmit) {
                displayCheckoutMessage('Vui lòng chọn hoặc nhập địa chỉ giao hàng.', 'error');
                return;
            }

            if (!currentCartData || !currentCartData.cart_id) {
                displayCheckoutMessage('Không tìm thấy thông tin giỏ hàng. Vui lòng thử lại.', 'error');
                fetchCartSummary();
                return;
            }
            const cartId = currentCartData.cart_id;

            const paymentMethodEl = document.querySelector('input[name="payment_method"]:checked');
            if (!paymentMethodEl) {
                displayCheckoutMessage('Vui lòng chọn phương thức thanh toán.', 'error');
                return;
            }
            const paymentMethod = paymentMethodEl.value;

            const orderPayload = {
                address_id: addressIdToSubmit,
                cart_id: cartId,
                payment_method: paymentMethod,
            };

            placeOrderBtn.disabled = true;
            placeOrderBtn.textContent = 'Đang xử lý...';

            try {
                const response = await fetch(`${API_BASE_URL}/api/orders/place`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(orderPayload)
                });
                const result = await response.json();
                if (response.ok && result.success) {
                    // ***** THAY ĐỔI Ở ĐÂY *****
                    displayCheckoutMessage('Đặt hàng thành công! Đang chuyển hướng đến lịch sử đơn hàng...', 'success', 0); // Hiển thị thông báo lâu hơn một chút
                    setTimeout(() => {
                        window.location.href = 'Order-history.html'; // Chuyển đến trang lịch sử đơn hàng
                    }, 2500); // Chờ 2.5 giây trước khi chuyển hướng
                    // ***** KẾT THÚC THAY ĐỔI *****
                } else {
                    let errorMsg = result.message || 'Đặt hàng thất bại.';
                    if (result.errors) {
                        for(const field in result.errors) errorMsg += `\n${result.errors[field].join(', ')}`;
                    }
                    if (result.product_id) {
                        errorMsg += ` Sản phẩm ID ${result.product_id} không đủ số lượng (còn ${result.available_stock}, yêu cầu ${result.requested_quantity}).`;
                    }
                    displayCheckoutMessage(errorMsg, 'error');
                    placeOrderBtn.disabled = false;
                    placeOrderBtn.textContent = 'Đặt hàng';
                }
            } catch (error) {
                console.error("Lỗi đặt hàng:", error);
                displayCheckoutMessage('Lỗi kết nối khi đặt hàng: ' + error.message, 'error');
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = 'Đặt hàng';
            }
        });
    }


    function handlePaymentMethodChange() {
        if (onlineBankingRadio && onlineBankingRadio.checked) {
            if (bankTransferInfoDiv) bankTransferInfoDiv.style.display = 'block';
        } else {
            if (bankTransferInfoDiv) bankTransferInfoDiv.style.display = 'none';
        }
    }

    if (codRadio) {
        codRadio.addEventListener('change', handlePaymentMethodChange);
    }
    if (onlineBankingRadio) {
        onlineBankingRadio.addEventListener('change', handlePaymentMethodChange);
    }

    // --- Khởi chạy ---
    const token = getAuthToken();
    if (!token) {
        displayCheckoutMessage('Vui lòng đăng nhập để tiến hành thanh toán.', 'error', 0);
        setTimeout(() => { window.location.href = 'Login.html'; }, 3000);
    } else {
        fetchUserAddresses();
        fetchCartSummary();
        setAddressFieldsDisabled(false);
        handlePaymentMethodChange();
    }
});
