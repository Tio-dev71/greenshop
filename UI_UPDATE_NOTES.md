# UI update notes

Đã làm mới giao diện theo hướng hiện đại, sáng và đồng bộ hơn.

Các thay đổi chính:
- Thêm `public/assets/css/theme.css` làm bộ theme chung: màu sắc, button, card, header, footer.
- Làm lại các trang:
  - `public/index.html`
  - `public/Homepage.html`
  - `public/Product-list.html`
  - `public/Login.html`
  - `public/Signup.html`
- Nâng cấp style các trang quan trọng khác:
  - `public/assets/css/Cart.css`
  - `public/assets/css/Checkout.css`
  - `public/assets/css/Product-detail.css`
- Sửa đường dẫn phân biệt hoa/thường để giảm lỗi khi deploy Linux:
  - `X.png`
  - `Cart.css`, `Checkout.css`
  - `Cart.js`, `Checkout.js`, `Notification.js`, `Order-Manage.js`

Gợi ý nếu muốn làm đẹp sâu hơn ở vòng sau:
- Làm đồng bộ UI cho toàn bộ trang admin
- Thêm toast notification đẹp hơn
- Thêm skeleton loading cho danh sách sản phẩm
- Làm dark mode hoặc theme premium
