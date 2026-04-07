document.addEventListener("DOMContentLoaded", function () {
    const API_BASE_URL = window.location.origin;
    const productGrid = document.querySelector(".product-grid");
    const paginationControls = document.querySelector(".pagination");
    const searchInput = document.getElementById("user-search-input") || document.getElementById("search-keyword-input");
    const searchButton = document.getElementById("user-search-button") || document.getElementById("search-button");
    const categoryFilters = document.querySelectorAll('input[name="category_user"], input[name="category"]');
    const sortOptions = document.getElementById("sort-options");

    let currentPage = 1;
    let currentKeyword = '';
    let currentCategory = '';
    let currentSortBy = 'ProductID';
    let currentSortDirection = 'desc';

    async function fetchProducts(page = 1, keyword = '', category = '') {
        try {
            const params = new URLSearchParams({
                page,
                keyword,
                category,
                sort_by: currentSortBy,
                sort_direction: currentSortDirection,
                per_page: 12
            });

            const response = await fetch(`${API_BASE_URL}/api/products?${params.toString()}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data && result.data.data) {
                renderProducts(result.data.data);
                renderPagination(result.data);
                currentPage = result.data.current_page;
            } else if (productGrid) {
                productGrid.innerHTML = `<p>Không tải được dữ liệu sản phẩm.</p>`;
            }
        } catch (error) {
            console.error("Error fetching products:", error);
            if (productGrid) productGrid.innerHTML = `<p>Lỗi khi tải dữ liệu: ${error.message}</p>`;
        }
    }

    function renderProducts(products) {
        if (!productGrid) return;
        productGrid.innerHTML = "";

        if (!products.length) {
            productGrid.innerHTML = `<p>Không có sản phẩm nào phù hợp.</p>`;
            return;
        }

        products.forEach(product => {
            const productItemLink = document.createElement("a");
            productItemLink.href = `Product-detail.html?id=${product.ProductID}`;

            const productItem = document.createElement("div");
            productItem.classList.add("product-item");

            const originalPriceFormatted = Number(product.Price).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
            let displayPrice = originalPriceFormatted;
            const discountedPrice = Number(product.discounted_price ?? (product.Price * (1 - (parseFloat(product.Discount) || 0))));
            const discountedPriceFormatted = discountedPrice.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

            if (parseFloat(product.Discount) > 0 && Number(product.Price) > discountedPrice) {
                displayPrice = `<span style="text-decoration: line-through; color: #888;">${originalPriceFormatted}</span> ${discountedPriceFormatted}`;
            }

            const imageUrl = product.Image
                ? (String(product.Image).startsWith('http') ? product.Image : `${API_BASE_URL}/storage/${product.Image}`)
                : 'assets/img/placeholder.png';

            productItem.innerHTML = `
                <img src="${imageUrl}" alt="${product.ProductName || 'Ảnh sản phẩm'}">
                <div class="product-name">${product.ProductName || 'N/A'}</div>
                <div class="product-price">${displayPrice}</div>
            `;

            productItemLink.appendChild(productItem);
            productGrid.appendChild(productItemLink);
        });
    }

    function renderPagination(paginationData) {
        if (!paginationControls) return;
        paginationControls.innerHTML = "";
        if (!paginationData || !paginationData.links || paginationData.last_page <= 1) return;

        paginationData.links.forEach(link => {
            const pageButton = document.createElement("button");
            pageButton.innerHTML = link.label;
            pageButton.disabled = !link.url;
            if (link.active) pageButton.classList.add("active");

            pageButton.addEventListener("click", (e) => {
                e.preventDefault();
                if (link.url) {
                    const urlParams = new URL(link.url).searchParams;
                    currentPage = parseInt(urlParams.get('page')) || 1;
                    fetchProducts(currentPage, currentKeyword, currentCategory);
                }
            });
            paginationControls.appendChild(pageButton);
        });
    }

    if (searchButton && searchInput) {
        searchButton.addEventListener("click", () => {
            currentKeyword = searchInput.value.trim();
            currentPage = 1;
            fetchProducts(currentPage, currentKeyword, currentCategory);
        });
        searchInput.addEventListener("keypress", (event) => {
            if (event.key === "Enter") searchButton.click();
        });
    }

    categoryFilters.forEach(el => el.addEventListener("change", (event) => {
        currentCategory = event.target.value;
        currentPage = 1;
        fetchProducts(currentPage, currentKeyword, currentCategory);
    }));

    if (sortOptions) {
        sortOptions.addEventListener("change", (event) => {
            const [sortBy, sortDirection] = event.target.value.split('_');
            currentSortBy = sortBy || 'ProductID';
            currentSortDirection = sortDirection || 'desc';
            currentPage = 1;
            fetchProducts(currentPage, currentKeyword, currentCategory);
        });
    }

    fetchProducts(currentPage, currentKeyword, currentCategory);
});
