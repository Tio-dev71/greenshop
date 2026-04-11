document.addEventListener("DOMContentLoaded", function () {
    const API_BASE_URL = window.location.origin;
    const productTableBody = document.getElementById("product-table-body");
    const addNewProductBtn = document.getElementById("add-new-product-btn");
    const productFormModal = document.getElementById("product-form-modal");
    const cancelProductFormBtn = document.getElementById("cancel-product-form");
    const addProductForm = document.getElementById("addProductForm");
    const formTitle = document.getElementById("form-title");
    const productIdInput = document.getElementById("productId");
    const productImageFileInput = document.getElementById("productImageFile");
    const imagePreview = document.getElementById("imagePreview");
    const productDiscountInput = document.getElementById("productDiscount");

    const adminLogoutButton = document.getElementById('admin-logout-button');
    const adminNameDisplay = document.getElementById('admin-name-display');
    const paginationControls = document.getElementById('pagination-controls');

    const productSearchInput = document.getElementById('product-search-input');
    const categoryFilterSelect = document.getElementById('product-category-filter');
    const sortBySelect = document.getElementById('product-sort-by');
    const sortDirectionSelect = document.getElementById('product-sort-direction');

    let currentPaginationData = null;
    let currentPage = 1;
    let currentSearchTerm = '';
    let currentCategory = '';
    let currentSortBy = 'ProductID';
    let currentSortDirection = 'desc';
    let searchDebounceTimer;

    function getAuthToken() {
        return localStorage.getItem('authToken');
    }

    function getAuthHeaders(isFormData = false) {
        const token = getAuthToken();
        const headers = {
            'Accept': 'application/json'
        };
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }
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

    async function fetchProducts(page = 1, searchTerm = '', category = '', sortBy = 'ProductID', sortDirection = 'desc') {
        currentPage = page;
        currentSearchTerm = searchTerm;
        currentCategory = category;
        currentSortBy = sortBy;
        currentSortDirection = sortDirection;

        let apiUrl = `${API_BASE_URL}/api/admin/products?page=${page}`;
        if (searchTerm) {
            apiUrl += `&keyword=${encodeURIComponent(searchTerm)}`;
        }
        if (category) {
            apiUrl += `&category=${encodeURIComponent(category)}`;
        }
        apiUrl += `&sort_by=${encodeURIComponent(sortBy)}`;
        apiUrl += `&sort_direction=${encodeURIComponent(sortDirection)}`;

        // Đã loại bỏ: console.log(`Workspaceing products from: ${apiUrl}`);

        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                if (response.status === 401) {
                    alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('authUser');
                    window.location.href = 'Login.html';
                    return;
                }
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || 'Unknown server error'}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                currentPaginationData = result.data;
                renderProducts(result.data.data);
                renderPagination(result.data);
            } else {
                console.error("Failed to fetch products:", result.message || "Unknown error", result);
                if(productTableBody) productTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Không tải được dữ liệu. ${result.message || ''}</td></tr>`;
                if(paginationControls) paginationControls.innerHTML = '';
            }
        } catch (error) {
            console.error("Error fetching products:", error);
            if(productTableBody) productTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Lỗi: ${error.message}</td></tr>`;
            if(paginationControls) paginationControls.innerHTML = '';
        }
    }

    function renderProducts(products) {
        if (!productTableBody) return;
        productTableBody.innerHTML = "";
        if (!products || products.length === 0) {
            productTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Không có sản phẩm nào phù hợp.</td></tr>`;
            return;
        }
        products.forEach(product => {
            const row = document.createElement("tr");
            row.setAttribute('data-id', product.ProductID);
            const formattedPrice = Number(product.Price).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

            let displayDiscount = "0%";
            if (product.Discount !== null && product.Discount !== undefined) {
                const discountValue = parseFloat(product.Discount);
                if (!isNaN(discountValue) && discountValue >= 0 && discountValue <= 1) {
                    displayDiscount = (discountValue * 100).toFixed(0) + '%';
                } else if (!isNaN(discountValue) && discountValue > 1 && discountValue <=100) {
                    displayDiscount = discountValue.toFixed(0) + '%';
                }
            }

            let imageUrl = 'assets/img/placeholder.png';
            let fullImageUrlForModal = 'assets/img/placeholder.png';
            if (product.Image) {
                if (product.Image.startsWith('http')) {
                    imageUrl = product.Image;
                    fullImageUrlForModal = product.Image;
                } else {
                    imageUrl = `${API_BASE_URL}/storage/${product.Image}`;
                    fullImageUrlForModal = imageUrl;
                }
            }

            row.innerHTML = `
                <td>${product.ProductID}</td>
                <td>${product.ProductName || 'N/A'}</td>
                <td>${formattedPrice}</td>
                <td>${displayDiscount}</td>
                <td>${product.Quantity || 0}</td>
                <td>${product.Category || 'N/A'}</td>
                <td>
                    <img src="${imageUrl}" alt="${product.ProductName || 'Ảnh'}" 
                         onerror="this.src='assets/img/placeholder.png'; this.onerror=null;"
                         style="width:50px; height:50px; object-fit:cover; border: 1px solid #ddd; vertical-align: middle;">
                    <button class="view-image-btn button-link-style" data-imageurl="${fullImageUrlForModal}" style="margin-left: 5px; vertical-align: middle;">Xem</button>
                </td>
                <td class="action">
                    <button class="edit-btn" data-id="${product.ProductID}">Sửa</button>
                    <button class="delete-btn" data-id="${product.ProductID}">Xóa</button>
                </td>
            `;
            productTableBody.appendChild(row);
        });
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
            if (label.includes('&laquo; Previous')) {
                label = '← Trước';
            } else if (label.includes('Next &raquo;')) {
                label = 'Sau →';
            }
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
                            fetchProducts(pageNumber, currentSearchTerm, currentCategory, currentSortBy, currentSortDirection);
                        }
                    } catch (error) {
                        console.error("Error parsing pagination URL or fetching page:", error, "URL was:", link.url);
                    }
                });
            } else if (label === "...") {
                pageButton.disabled = true;
            }
            paginationControls.appendChild(pageButton);
        });
    }

    function handleFilterOrSortChange() {
        fetchProducts(1,
            productSearchInput.value.trim(),
            categoryFilterSelect.value,
            sortBySelect.value,
            sortDirectionSelect.value
        );
    }

    if (productSearchInput) {
        productSearchInput.addEventListener('input', function () {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                handleFilterOrSortChange();
            }, 500);
        });
    }
    if (categoryFilterSelect) {
        categoryFilterSelect.addEventListener('change', handleFilterOrSortChange);
    }
    if (sortBySelect) {
        sortBySelect.addEventListener('change', handleFilterOrSortChange);
    }
    if (sortDirectionSelect) {
        sortDirectionSelect.addEventListener('change', handleFilterOrSortChange);
    }

    function openProductForm(product = null) {
        if (!addProductForm || !formTitle || !productIdInput || !productImageFileInput || !imagePreview || !productDiscountInput) {
            console.error("Một hoặc nhiều element của form sản phẩm không tìm thấy.");
            return;
        }
        addProductForm.reset();
        imagePreview.style.display = 'none';
        imagePreview.src = '#';
        productImageFileInput.value = null;

        if (product) {
            formTitle.textContent = "Chỉnh Sửa Sản Phẩm";
            productIdInput.value = product.ProductID;
            document.getElementById("productName").value = product.ProductName || '';
            document.getElementById("productCategory").value = product.Category || '';
            document.getElementById("productPrice").value = product.Price || '';

            const discountFromDb = parseFloat(product.Discount);
            document.getElementById("productDiscount").value = !isNaN(discountFromDb) ? (discountFromDb * 100).toFixed(0) : 0;


            document.getElementById("productQuantity").value = product.Quantity || 0;
            document.getElementById("productDescription").value = product.Description || '';
            if (product.Image) {
                const currentImageUrl = product.Image.startsWith('http') ? product.Image : `${API_BASE_URL}/storage/${product.Image}`;
                imagePreview.src = currentImageUrl;
                imagePreview.style.display = 'block';
            }

        } else {
            formTitle.textContent = "Thêm Sản Phẩm Mới";
            productIdInput.value = '';
            document.getElementById("productDiscount").value = 0;
        }
        if (productFormModal) productFormModal.style.display = "flex";
    }

    if (addNewProductBtn) {
        addNewProductBtn.addEventListener("click", () => openProductForm());
    }
    if (cancelProductFormBtn) {
        cancelProductFormBtn.addEventListener("click", () => {
            if (productFormModal) productFormModal.style.display = "none";
        });
    }
    if (productFormModal) {
        productFormModal.addEventListener("click", function(event) {
            if (event.target === productFormModal) {
                productFormModal.style.display = "none";
            }
        });
    }

    if (productImageFileInput && imagePreview) {
        productImageFileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = 'block';
                }
                reader.readAsDataURL(file);
            } else {
                imagePreview.src = '#';
            }
        });
    }

    if (addProductForm) {
        addProductForm.addEventListener("submit", async function(event) {
            event.preventDefault();
            const saveButton = document.getElementById('save-product-button');
            if (!saveButton) return;
            saveButton.disabled = true;
            saveButton.textContent = 'Đang lưu...';

            const currentProductIdVal = productIdInput.value;
            const isEditing = !!currentProductIdVal;

            const formData = new FormData();
            formData.append('ProductName', document.getElementById("productName").value);
            formData.append('Category', document.getElementById("productCategory").value);
            formData.append('Price', parseFloat(document.getElementById("productPrice").value));

            let discountPercentValue = parseFloat(document.getElementById("productDiscount").value);
            if (isNaN(discountPercentValue) || discountPercentValue < 0) {
                discountPercentValue = 0;
            }
            if (discountPercentValue > 100) {
                discountPercentValue = 100;
            }
            formData.append('Discount', discountPercentValue / 100);

            formData.append('Quantity', parseInt(document.getElementById("productQuantity").value));
            formData.append('Description', document.getElementById("productDescription").value.trim() || '');

            if (productImageFileInput.files[0]) {
                formData.append('ImageFile', productImageFileInput.files[0]);
            }

            let apiUrl = isEditing ? `${API_BASE_URL}/api/admin/products/${currentProductIdVal}` : `${API_BASE_URL}/api/admin/products`;
            let apiMethod = 'POST';
            if (isEditing) {
                formData.append('_method', 'PUT');
            }

            try {
                const response = await fetch(apiUrl, {
                    method: apiMethod,
                    headers: getAuthHeaders(true),
                    body: formData
                });
                const result = await response.json();
                if (response.ok && result.success) {
                    alert(`Sản phẩm đã được ${isEditing ? 'cập nhật' : 'thêm'} thành công!`);
                    if (productFormModal) productFormModal.style.display = "none";
                    fetchProducts(isEditing ? currentPage : 1, currentSearchTerm, currentCategory, currentSortBy, currentSortDirection);
                } else {
                    let errorMessages = result.message || (isEditing ? 'Cập nhật' : 'Thêm') + ' sản phẩm thất bại.';
                    if (result.errors) {
                        errorMessages += "\nChi tiết:\n";
                        for (const field in result.errors) {
                            errorMessages += `- ${result.errors[field].join(', ')}\n`;
                        }
                    }
                    alert(errorMessages);
                }
            } catch (error) {
                console.error(`Error ${isEditing ? 'updating' : 'adding'} product:`, error);
                alert(`Đã có lỗi xảy ra khi ${isEditing ? 'cập nhật' : 'thêm'} sản phẩm. Kiểm tra console.`);
            } finally {
                saveButton.disabled = false;
                saveButton.textContent = 'Lưu';
            }
        });
    }

    if (productTableBody) {
        productTableBody.addEventListener("click", async function(event) {
            const targetButton = event.target.closest("button");
            if (!targetButton) return;

            const productIdVal = targetButton.dataset.id;

            if (targetButton.classList.contains("delete-btn")) {
                if (confirm(`Bạn có chắc chắn muốn xóa sản phẩm ID: ${productIdVal}?`)) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/admin/products/${productIdVal}`, {
                            method: 'DELETE',
                            headers: getAuthHeaders()
                        });
                        const result = await response.json();
                        if (response.ok && result.success) {
                            alert(result.message || 'Xóa sản phẩm thành công!');
                            let pageToFetch = currentPage;
                            if (productTableBody.rows.length === 1 && pageToFetch > 1 && currentPaginationData && currentPaginationData.total > 0) {
                                if ((currentPaginationData.total -1) <= (pageToFetch -1) * currentPaginationData.per_page){
                                    pageToFetch--;
                                }
                            }
                            fetchProducts(pageToFetch, currentSearchTerm, currentCategory, currentSortBy, currentSortDirection);
                        } else {
                            alert(`Lỗi: ${result.message || 'Xóa sản phẩm thất bại.'}`);
                        }
                    } catch (error) {
                        console.error("Error deleting product:", error);
                        alert("Đã có lỗi xảy ra khi xóa sản phẩm.");
                    }
                }
            } else if (targetButton.classList.contains("edit-btn")) {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/admin/products/${productIdVal}`, {
                        method: 'GET',
                        headers: getAuthHeaders()
                    });
                    if (!response.ok) throw new Error('Failed to fetch product details for editing.');
                    const result = await response.json();
                    if (result.success && result.data) {
                        openProductForm(result.data);
                    } else {
                        alert(`Lỗi: ${result.message || 'Không thể lấy thông tin sản phẩm để sửa.'}`);
                    }
                } catch (error) {
                    console.error("Error fetching product for edit:", error);
                    alert("Lỗi khi lấy thông tin sản phẩm để sửa.");
                }
            }
            else if (targetButton.classList.contains('view-image-btn')) {
                const imageUrl = targetButton.dataset.imageurl;
                
                // Cải thiện kiểm tra placeholder hoặc url không hợp lệ
                const isInvalidUrl = !imageUrl || 
                                     imageUrl.includes('placeholder.png') || 
                                     imageUrl.endsWith('undefined') || 
                                     imageUrl.endsWith('null') || 
                                     imageUrl === `${API_BASE_URL}/storage/`;

                if (!isInvalidUrl) {
                    const modal = document.createElement('div');
                    modal.className = 'image-view-modal'; // Thêm class để dễ style nếu cần
                    modal.style.position = 'fixed';
                    modal.style.left = '0';
                    modal.style.top = '0';
                    modal.style.width = '100%';
                    modal.style.height = '100%';
                    modal.style.backgroundColor = 'rgba(0,0,0,0.85)';
                    modal.style.display = 'flex';
                    modal.style.justifyContent = 'center';
                    modal.style.alignItems = 'center';
                    modal.style.zIndex = '2000';
                    modal.style.cursor = 'zoom-out';
                    modal.onclick = function() { if (document.body.contains(modal)) document.body.removeChild(modal); };

                    const imgWrapper = document.createElement('div');
                    imgWrapper.style.position = 'relative';

                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.style.maxWidth = '90vw';
                    img.style.maxHeight = '90vh';
                    img.style.border = '5px solid white';
                    img.style.borderRadius = '8px';
                    img.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5)';
                    img.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    img.onclick = function(e) { e.stopPropagation(); };
                    
                    // Thêm hiệu ứng zoom nhẹ khi hiện
                    setTimeout(() => { img.style.transform = 'scale(1)'; }, 10);
                    img.style.transform = 'scale(0.8)';

                    const closeBtn = document.createElement('span');
                    closeBtn.innerHTML = '&times;';
                    closeBtn.style.position = 'absolute';
                    closeBtn.style.top = '-20px';
                    closeBtn.style.right = '-20px';
                    closeBtn.style.fontSize = '40px';
                    closeBtn.style.color = 'white';
                    closeBtn.style.cursor = 'pointer';
                    closeBtn.style.fontWeight = 'bold';
                    
                    imgWrapper.appendChild(img);
                    imgWrapper.appendChild(closeBtn);
                    modal.appendChild(imgWrapper);
                    document.body.appendChild(modal);
                } else {
                    alert('Sản phẩm này hiện chưa có ảnh hoặc đang sử dụng ảnh mặc định.');
                }
            }
        });
    }
    fetchProducts(currentPage, currentSearchTerm, currentCategory, currentSortBy, currentSortDirection);
});
