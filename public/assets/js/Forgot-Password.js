document.addEventListener("DOMContentLoaded", function () {
    const API_BASE_URL = window.location.origin;
    const forgotForm = document.getElementById("forgot-password-form");
    const resetForm = document.getElementById("reset-password-form");
    const statusMessage = document.getElementById("status-message");
    const submitBtn = document.getElementById("submit-button");

    function showMessage(msg, isError = false) {
        if (!statusMessage) return;
        statusMessage.textContent = msg;
        statusMessage.style.color = isError ? "red" : "green";
    }

    // Logic cho trang Quên mật khẩu
    if (forgotForm) {
        forgotForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const email = document.getElementById("email").value.trim();

            submitBtn.disabled = true;
            submitBtn.textContent = "Đang gửi...";
            showMessage("");

            try {
                const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (response.ok) {
                    showMessage(data.message || "Liên kết đặt lại mật khẩu đã được gửi!");
                    forgotForm.reset();
                } else {
                    showMessage(data.message || "Có lỗi xảy ra. Vui lòng thử lại.", true);
                }
            } catch (error) {
                console.error("Forgot password error:", error);
                showMessage("Lỗi kết nối server.", true);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Gửi yêu cầu";
            }
        });
    }

    // Logic cho trang Đặt lại mật khẩu
    if (resetForm) {
        // Lấy token và email từ URL params
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const email = urlParams.get('email');

        if (!token || !email) {
            showMessage("Yêu cầu không hợp lệ. Vui lòng kiểm tra lại email của bạn.", true);
            submitBtn.disabled = true;
        } else {
            document.getElementById("token").value = token;
            document.getElementById("email").value = email;
        }

        resetForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const password = document.getElementById("password").value;
            const password_confirmation = document.getElementById("password_confirmation").value;

            if (password !== password_confirmation) {
                showMessage("Mật khẩu xác nhận không khớp.", true);
                return;
            }

            if (password.length < 6) {
                showMessage("Mật khẩu phải có ít nhất 6 ký tự.", true);
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = "Đang cập nhật...";
            showMessage("");

            try {
                const response = await fetch(`${API_BASE_URL}/api/reset-password`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        token,
                        email,
                        password,
                        password_confirmation
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    showMessage("Cập nhật mật khẩu thành công! Đang chuyển hướng...", false);
                    setTimeout(() => {
                        window.location.href = "Login.html";
                    }, 2000);
                } else {
                    showMessage(data.message || "Đặt lại mật khẩu thất bại.", true);
                }
            } catch (error) {
                console.error("Reset password error:", error);
                showMessage("Lỗi kết nối server.", true);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Cập nhật mật khẩu";
            }
        });
    }
});
