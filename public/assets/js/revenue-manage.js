document.addEventListener("DOMContentLoaded", function() {
    const API_BASE_URL = window.location.origin;
    const revenueTableBody = document.getElementById("revenue-table-body");
    const groupBySelect = document.getElementById("group-by-select"); // New element
    const fromDateInput = document.getElementById("from-date-input");
    const toDateInput = document.getElementById("to-date-input");
    const viewStatsBtn = document.getElementById("view-stats-btn");
    const paginationControls = document.getElementById('pagination-controls');
    const adminLogoutButton = document.getElementById('admin-logout-button');
    const adminNameDisplay = document.getElementById('admin-name-display');
    const revenueManagerMessageEl = document.getElementById('revenue-manager-message');
    const periodHeader = document.getElementById('period-header'); // Table header for period

    let currentRevenuePage = 1;
    let currentGroupBy = 'day'; // Default grouping
    let currentDateFrom = '';
    let currentDateTo = '';

    // --- Auth & Admin Info ---
    function getAuthToken() { return localStorage.getItem('authToken'); }
    function getAuthHeaders() {
        const token = getAuthToken();
        const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    }
    const currentAdminUser = JSON.parse(localStorage.getItem('authUser'));
    if (currentAdminUser && adminNameDisplay) {
        adminNameDisplay.textContent = `Chào, ${currentAdminUser.name}`;
    }
    if (adminLogoutButton) {
        adminLogoutButton.addEventListener('click', async function(event) {
            event.preventDefault();
            if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
                if(getAuthToken()) { try { await fetch(`${API_BASE_URL}/api/logout`, { method: 'POST', headers: getAuthHeaders() }); } catch(e) { console.error("Logout API call failed", e); } }
                localStorage.removeItem('authToken'); localStorage.removeItem('authUser');
                window.location.href = 'Login.html';
            }
        });
    }
    function displayPageMessage(message, type = 'error', duration = 4000) {
        if (revenueManagerMessageEl) {
            revenueManagerMessageEl.textContent = message;
            revenueManagerMessageEl.className = 'message-area'; // Reset
            revenueManagerMessageEl.classList.add(type === 'success' ? 'success-message' : 'error-message');
            // Apply styles consistently
            revenueManagerMessageEl.style.color = type === 'success' ? '#155724' : '#721c24';
            revenueManagerMessageEl.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
            revenueManagerMessageEl.style.border = `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`;
            revenueManagerMessageEl.style.padding = '8px';
            revenueManagerMessageEl.style.borderRadius = '4px';
            revenueManagerMessageEl.style.textAlign = 'center';
            revenueManagerMessageEl.style.display = 'block';
            if (duration > 0) {
                setTimeout(() => {
                    revenueManagerMessageEl.textContent = '';
                    revenueManagerMessageEl.style.display = 'none';
                }, duration);
            }
        }
    }

    function formatCurrency(amount) {
        return Number(amount).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
    }

    function formatPeriodForDisplay(periodData, groupBy) {
        if (!periodData) return 'N/A';
        try {
            if (groupBy === 'day') { // periodData is 'YYYY-MM-DD'
                const date = new Date(periodData + 'T00:00:00'); // Ensure local date
                return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            } else if (groupBy === 'month') { // periodData is { year: YYYY, month: M }
                const month = String(periodData.month).padStart(2, '0');
                return `${month}/${periodData.year}`;
            } else if (groupBy === 'year') { // periodData is { year: YYYY }
                return String(periodData.year);
            }
            return 'N/A';
        } catch (e) {
            console.error("Error formatting period:", periodData, groupBy, e);
            return 'N/A';
        }
    }

    async function fetchRevenueData(page = 1, groupBy = 'day', fromDate = '', toDate = '') {
        currentRevenuePage = page;
        currentGroupBy = groupBy;
        currentDateFrom = fromDate;
        currentDateTo = toDate;

        let url = `${API_BASE_URL}/api/admin/revenue/summary?page=${page}&group_by=${groupBy}`;
        if (fromDate) url += `&from_date=${fromDate}`;
        if (toDate) url += `&to_date=${toDate}`;

        revenueTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Đang tải dữ liệu doanh thu...</td></tr>`;
        displayPageMessage('', 'info', 0); // Clear previous messages

        try {
            const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
            if (!response.ok) {
                if (response.status === 401) {
                    displayPageMessage("Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.", "error", 0);
                    setTimeout(() => { window.location.href = 'Login.html'; }, 2500);
                    return;
                }
                const err = await response.json().catch(() => ({message: `Lỗi máy chủ ${response.status}. Vui lòng thử lại sau.`}));
                throw new Error(err.message);
            }
            const result = await response.json();
            if (result.success && result.data) {
                renderRevenueTable(result.data.data, groupBy);
                renderRevenuePagination(result.data, groupBy); // Pass groupBy for pagination state
            } else {
                revenueTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">${result.message || 'Không tải được dữ liệu.'}</td></tr>`;
                displayPageMessage(result.message || 'Không tải được dữ liệu.', 'error');
            }
        } catch (error) {
            console.error("Error fetching revenue data:", error);
            revenueTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Lỗi: ${error.message}</td></tr>`;
            displayPageMessage(`Lỗi tải dữ liệu: ${error.message}`, 'error');
        }
    }

    function renderRevenueTable(summaryData, groupBy) {
        revenueTableBody.innerHTML = "";
        // Update table header based on groupBy
        if (periodHeader) {
            if (groupBy === 'day') periodHeader.textContent = 'Ngày';
            else if (groupBy === 'month') periodHeader.textContent = 'Tháng';
            else if (groupBy === 'year') periodHeader.textContent = 'Năm';
            else periodHeader.textContent = 'Thời kỳ';
        }

        if (!summaryData || summaryData.length === 0) {
            revenueTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Không có dữ liệu doanh thu cho khoảng thời gian và kiểu thống kê đã chọn.</td></tr>`;
            return;
        }
        summaryData.forEach(item => {
            const row = revenueTableBody.insertRow();
            let periodDisplayValue = 'N/A';
            if (groupBy === 'day' && item.period_identifier) {
                periodDisplayValue = formatPeriodForDisplay(item.period_identifier, 'day');
            } else if (groupBy === 'month' && item.year && item.month) {
                periodDisplayValue = formatPeriodForDisplay({ year: item.year, month: item.month }, 'month');
            } else if (groupBy === 'year' && item.year) {
                periodDisplayValue = formatPeriodForDisplay({ year: item.year }, 'year');
            }

            row.innerHTML = `
                <td>${periodDisplayValue}</td>
                <td>${item.total_orders}</td>
                <td>${item.total_products_sold || 0}</td>
                <td>${formatCurrency(item.total_revenue)}</td>
            `;
        });
    }

    function renderRevenuePagination(paginationData, groupBy) {
        if (!paginationControls || !paginationData || !paginationData.links || paginationData.links.length === 0) {
            if(paginationControls) paginationControls.innerHTML = '';
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
                        if (pageNumber) fetchRevenueData(pageNumber, groupBy, currentDateFrom, currentDateTo);
                    } catch (error) { console.error("Pagination URL error:", error); }
                });
            } else if (label === "...") {
                pageButton.disabled = true;
            }
            paginationControls.appendChild(pageButton);
        });
    }

    if (viewStatsBtn) {
        viewStatsBtn.addEventListener('click', () => {
            const groupBy = groupBySelect.value;
            const fromDate = fromDateInput.value;
            const toDate = toDateInput.value;
            if (fromDate && toDate && fromDate > toDate) {
                displayPageMessage("Ngày bắt đầu không thể lớn hơn ngày kết thúc.", "error");
                return;
            }
            fetchRevenueData(1, groupBy, fromDate, toDate);
        });
    }

    // Set default date range (e.g., last 30 days) and fetch initial data
    const today = new Date();
    const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 29));
    if (toDateInput) toDateInput.valueAsDate = today;
    if (fromDateInput) fromDateInput.valueAsDate = thirtyDaysAgo;

    if(fromDateInput && toDateInput && fromDateInput.value && toDateInput.value && groupBySelect){
        fetchRevenueData(1, groupBySelect.value, fromDateInput.value, toDateInput.value);
    } else if(revenueTableBody) {
        revenueTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Vui lòng chọn bộ lọc và nhấn "Xem thống kê".</td></tr>`;
    }
});
