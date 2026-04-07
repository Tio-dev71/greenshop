document.addEventListener('DOMContentLoaded', function () {
    console.log('Notification Script Loaded.');

    const API_BASE_URL = window.location.origin;

    // --- Auth Helper Functions (reuse or define here if not in a global script) ---
    function getAuthToken() { return localStorage.getItem('authToken'); }
    function getAuthHeaders() {
        const token = getAuthToken();
        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    }
    async function logoutUserNotification() {
        if (getAuthToken()) {
            try { await fetch(`${API_BASE_URL}/api/logout`, { method: 'POST', headers: getAuthHeaders() }); }
            catch (e) { console.error('Logout API call failed', e); }
        }
        localStorage.removeItem('authToken'); localStorage.removeItem('authUser');
        window.location.href = 'Login.html';
    }

    // --- DOM Elements ---
    const notificationListEl = document.getElementById('notification-list');
    const paginationControlsEl = document.getElementById('notification-pagination-controls');
    const pageMessageEl = document.getElementById('notification-page-message');
    const noNotificationsMessageEl = document.getElementById('no-notifications-message');
    const markAllReadBtn = document.getElementById('mark-all-read-btn');
    const logoutIcon = document.getElementById('logout-icon-notification');
    const unreadBadgeEl = document.getElementById('unread-notifications-badge');

    let currentNotificationPage = 1;

    if (!notificationListEl || !paginationControlsEl || !pageMessageEl || !noNotificationsMessageEl || !markAllReadBtn || !unreadBadgeEl) {
        console.error("CRITICAL: Essential DOM elements for Notification page are missing!");
        return;
    }

    if (logoutIcon) {
        logoutIcon.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) logoutUserNotification();
        });
    }

    function displayPageMessage(message, type = 'error', duration = 3000) {
        if (pageMessageEl) {
            pageMessageEl.textContent = message;
            pageMessageEl.className = 'message-area';
            pageMessageEl.classList.add(type === 'success' ? 'success-message' : 'error-message');
            // Match User-info.css styling for messages
            pageMessageEl.style.color = type === 'success' ? '#155724' : '#721c24';
            pageMessageEl.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
            pageMessageEl.style.border = `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`;
            pageMessageEl.style.padding = '8px';
            pageMessageEl.style.display = 'block';

            if (duration > 0) setTimeout(() => clearPageMessage(), duration);
        }
    }
    function clearPageMessage() {
        if (pageMessageEl) {
            pageMessageEl.textContent = '';
            pageMessageEl.className = 'message-area';
            pageMessageEl.style.display = 'none';
        }
    }

    function formatDateForNotification(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            // More verbose format for notifications
            return date.toLocaleString('vi-VN', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) { return dateString; }
    }

    async function fetchNotifications(page = 1) {
        console.log(`Workspaceing notifications for page: ${page}`);
        currentNotificationPage = page;
        const token = getAuthToken();
        if (!token) {
            displayPageMessage('Vui lòng đăng nhập để xem thông báo.', 'error', 0);
            if (noNotificationsMessageEl) noNotificationsMessageEl.style.display = 'block';
            notificationListEl.innerHTML = ''; return;
        }

        notificationListEl.innerHTML = '<li>Đang tải thông báo...</li>';
        if (noNotificationsMessageEl) noNotificationsMessageEl.style.display = 'none';
        clearPageMessage();

        try {
            const response = await fetch(`${API_BASE_URL}/api/notifications?page=${page}`, { headers: getAuthHeaders() });
            const result = await response.json();
            console.log("Notifications API Response:", result);

            if (!response.ok) {
                if (response.status === 401) { displayPageMessage('Phiên đăng nhập hết hạn.', 'error', 0); logoutUserNotification(); return; }
                throw new Error(result.message || `Lỗi ${response.status} khi tải thông báo.`);
            }

            if (result.success && result.data && Array.isArray(result.data.data)) {
                renderNotifications(result.data.data);
                renderNotificationPagination(result.data);
                fetchUnreadCount(); // Update badge after fetching list
            } else {
                throw new Error(result.message || 'Không thể xử lý dữ liệu thông báo.');
            }
        } catch (error) {
            console.error('Lỗi fetchNotifications:', error);
            notificationListEl.innerHTML = `<li style="color:red; text-align:center;">${error.message}</li>`;
            displayPageMessage(error.message, 'error');
            if (page === 1) if (noNotificationsMessageEl) noNotificationsMessageEl.style.display = 'block';
        }
    }

    function renderNotifications(notifications) {
        notificationListEl.innerHTML = '';
        if (notifications.length === 0) {
            if (noNotificationsMessageEl) noNotificationsMessageEl.style.display = 'block';
            return;
        }
        if (noNotificationsMessageEl) noNotificationsMessageEl.style.display = 'none';

        notifications.forEach(notification => {
            const item = document.createElement('li');
            item.classList.add('notification-item');
            if (!notification.read_at) {
                item.classList.add('unread');
            }
            item.dataset.notificationId = notification.NotificationID;

            // Optional: Create a link if notification.link exists
            // let linkStart = '', linkEnd = '';
            // if (notification.link) {
            //    linkStart = `<a href="${API_BASE_URL}${notification.link}" class="notification-link">`;
            //    linkEnd = `</a>`;
            // }

            item.innerHTML = `
                <div class="notification-content">
                    <div class="notification-title">${notification.Title || 'Thông báo'}</div>
                    <div class="notification-description">${notification.Description || ''}</div>
                    <div class="notification-date">${formatDateForNotification(notification.created_at)}</div>
                </div>
                ${!notification.read_at ? `
                <div class="notification-actions">
                    <button class="btn-mark-one-read" data-id="${notification.NotificationID}">Đánh dấu đã đọc</button>
                </div>` : ''}
            `;
            // If using link: Replace <div class="notification-content">...</div> with linkStart + <div...> + linkEnd

            notificationListEl.appendChild(item);
        });

        document.querySelectorAll('.btn-mark-one-read').forEach(button => {
            button.addEventListener('click', function() {
                const notificationId = this.dataset.id;
                markOneAsRead(notificationId);
            });
        });
        // Add click listener to the whole unread item to mark as read (and potentially navigate if there's a link)
        document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.addEventListener('click', function(event) {
                // Prevent marking as read if the click was on the "mark as read" button itself
                if (event.target.classList.contains('btn-mark-one-read')) {
                    return;
                }
                const notificationId = this.dataset.notificationId;
                markOneAsRead(notificationId, true); // true to potentially navigate if link exists
            });
        });
    }

    async function markOneAsRead(notificationId, shouldNavigateIfLink = false) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
                method: 'PATCH',
                headers: getAuthHeaders()
            });
            const result = await response.json();
            if (result.success) {
                // Visually update the item without full re-fetch for speed
                const itemEl = notificationListEl.querySelector(`.notification-item[data-notification-id="${notificationId}"]`);
                if (itemEl) {
                    itemEl.classList.remove('unread');
                    const actionDiv = itemEl.querySelector('.notification-actions');
                    if (actionDiv) actionDiv.remove();
                }
                fetchUnreadCount(); // Update badge
                // If shouldNavigateIfLink and result.data.link, then window.location.href = result.data.link
            } else {
                displayPageMessage(result.message || 'Lỗi khi đánh dấu đã đọc.', 'error');
            }
        } catch (error) {
            displayPageMessage('Lỗi kết nối: ' + error.message, 'error');
        }
    }

    if(markAllReadBtn){
        markAllReadBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/notifications/mark-all-read`, {
                    method: 'POST',
                    headers: getAuthHeaders()
                });
                const result = await response.json();
                if (result.success) {
                    displayPageMessage(result.message, 'success', 2000);
                    fetchNotifications(currentNotificationPage); // Refresh current page
                    fetchUnreadCount(); // Update badge
                } else {
                    displayPageMessage(result.message || 'Lỗi khi đánh dấu tất cả đã đọc.', 'error');
                }
            } catch (error) {
                displayPageMessage('Lỗi kết nối: ' + error.message, 'error');
            }
        });
    }


    function renderNotificationPagination(paginationData) {
        paginationControlsEl.innerHTML = '';
        if (!paginationData || !paginationData.links || paginationData.last_page <= 1) return;

        paginationData.links.forEach(link => {
            const pageButton = document.createElement("button");
            let label = link.label.replace('&laquo; Previous', '&laquo; Trước').replace('Next &raquo;', 'Sau &raquo;');
            pageButton.innerHTML = label;
            pageButton.disabled = !link.url;
            if (link.active) pageButton.classList.add("active");

            pageButton.addEventListener("click", (e) => {
                e.preventDefault();
                if (link.url) {
                    try {
                        const urlParams = new URL(link.url).searchParams;
                        const pageNumber = parseInt(urlParams.get('page'));
                        if (!isNaN(pageNumber)) fetchNotifications(pageNumber);
                    } catch (error) { console.error("Pagination URL error:", error); }
                }
            });
            paginationControlsEl.appendChild(pageButton);
        });
    }

    async function fetchUnreadCount() {
        if (!getAuthToken()) { // Don't try if not logged in
            if(unreadBadgeEl) unreadBadgeEl.style.display = 'none';
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, { headers: getAuthHeaders() });
            const result = await response.json();
            if (result.success && result.data && unreadBadgeEl) {
                const count = result.data.unread_count;
                if (count > 0) {
                    unreadBadgeEl.textContent = count > 9 ? '9+' : count;
                    unreadBadgeEl.style.display = 'inline';
                } else {
                    unreadBadgeEl.style.display = 'none';
                }
            } else {
                if(unreadBadgeEl) unreadBadgeEl.style.display = 'none';
            }
        } catch (error) {
            console.error("Error fetching unread count:", error);
            if(unreadBadgeEl) unreadBadgeEl.style.display = 'none';
        }
    }

    // --- Initial Load ---
    fetchNotifications(1);
    fetchUnreadCount(); // Also fetch count for the badge on initial load
});
