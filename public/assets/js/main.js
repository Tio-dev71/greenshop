/* ==============================
   Config chung
   ============================== */
const API_BASE = window.location.origin;

function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Hàm tạo headers kèm token
function getAuthHeaders() {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// Hàm lấy thông tin user từ localStorage (nếu có)
function getAuthUser() {
    const userString = localStorage.getItem('authUser');
    if (userString) {
        try {
            return JSON.parse(userString);
        } catch (e) {
            console.error("Error parsing authUser from localStorage", e);
            return null;
        }
    }
    return null;
}

// Hàm xử lý logout ở client
function logoutClientSide() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    console.log('Token and user info removed from localStorage.');
    // Chuyển hướng về trang đăng nhập (hoặc trang chủ nếu muốn)
    window.location.href = 'Login.html';
}

/* ==============================
   Hàm gọi API Sign-up
   ============================== */
async function callSignup(payload) {
    // Hàm này được gọi từ Validator sau khi dữ liệu form đã được kiểm tra (bao gồm password confirmation)
    // Nếu backend không cần trường password_confirmation, có thể xóa nó khỏi payload ở đây
    // delete payload.password_confirmation; // Bỏ comment nếu backend không xử lý/cần password_confirmation

    try {
        const res = await fetch(`${API_BASE}/api/signup`, { // Sử dụng /api/signup cho chuẩn API
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json' // Thêm Accept header
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json(); // Cố gắng parse JSON bất kể status

        if (res.ok) { // res.ok là true nếu status là 200-299
            // data.user.name là từ response của AuthController đã sửa
            alert(`Đăng ký thành công – xin chào ${data.user ? data.user.name : 'bạn'}!`);
            window.location.href = 'Login.html'; // Chuyển sang trang Login.html
        } else {
            // Xử lý lỗi từ server (validation errors hoặc lỗi khác)
            let errorMessage = 'Đăng ký thất bại.';
            if (data && data.errors) { // Lỗi validation từ Laravel
                errorMessage += '\n';
                for (const key in data.errors) {
                    errorMessage += `- ${data.errors[key].join(', ')}\n`;
                }
            } else if (data && data.message) { // Thông báo lỗi chung từ server
                errorMessage += ` ${data.message}`;
            } else {
                errorMessage += ` Lỗi không xác định từ server (Status: ${res.status}).`;
            }
            alert(errorMessage);
        }
    } catch (err) {
        alert('Không thể kết nối tới server hoặc có lỗi khi xử lý yêu cầu. Vui lòng kiểm tra console.');
        console.error("Lỗi khi gọi API đăng ký:", err);
    }
}

/* ==============================
   Validator Object và các phương thức
   ============================== */
function Validator(options) {
    var selectorRules = {}; // Lưu các rules cho mỗi selector

    // Hàm tìm element cha dựa trên selector
    function getParent(element, selector) {
        while (element.parentElement) {
            if (element.parentElement.matches(selector)) {
                return element.parentElement;
            }
            element = element.parentElement;
        }
        return null; // Trả về null nếu không tìm thấy
    }

    // Hàm thực hiện validate cho một input
    function validate(inputElement, formGroupElement, errorElement, rule) {
        var errorMessage;
        var rules = selectorRules[rule.selector]; // Lấy danh sách các rule test function

        // Lặp qua các rule test function và dừng lại khi có lỗi
        for (var i = 0; i < rules.length; ++i) {
            // Truyền giá trị của input vào rule test function
            // Đối với isConfirmed, nó cần giá trị của password gốc
            if (rule.selector === '#password_confirmation') {
                const passwordValue = formElement.querySelector('#password').value;
                errorMessage = rules[i](inputElement.value, passwordValue);
            } else {
                errorMessage = rules[i](inputElement.value);
            }
            if (errorMessage) break; // Dừng nếu có lỗi
        }

        if (errorMessage) {
            errorElement.innerText = errorMessage;
            formGroupElement.classList.add('invalid'); // Thêm class invalid cho form-group
        } else {
            errorElement.innerText = '';
            formGroupElement.classList.remove('invalid'); // Bỏ class invalid
        }

        return !errorMessage; // Trả về true nếu hợp lệ (không có lỗi), false nếu có lỗi
    }

    var formElement = document.querySelector(options.form);
    if (formElement) {
        /* ====== XỬ LÝ SUBMIT FORM ====== */
        formElement.onsubmit = function (e) {
            e.preventDefault(); // Ngăn hành vi submit mặc định

            var isFormValid = true; // Giả định form hợp lệ ban đầu

            // Lặp qua từng rule và validate
            options.rules.forEach(function (rule) {
                var inputElement = formElement.querySelector(rule.selector);
                if (inputElement) {
                    var formGroupElement = getParent(inputElement, options.formGroupSelector);
                    var errorElement = formGroupElement ? formGroupElement.querySelector(options.errorSelector) : null;

                    if (formGroupElement && errorElement) {
                        var isValidRule = validate(inputElement, formGroupElement, errorElement, rule);
                        if (!isValidRule) {
                            isFormValid = false; // Nếu một rule không hợp lệ, toàn bộ form không hợp lệ
                        }
                    } else {
                        console.warn(`Không tìm thấy formGroupSelector hoặc errorSelector cho input: ${rule.selector}`);
                        isFormValid = false;
                    }
                } else {
                    console.warn(`Không tìm thấy input element với selector: ${rule.selector}`);
                    isFormValid = false;
                }
            });

            if (isFormValid) {
                // Lấy tất cả giá trị từ form nếu hợp lệ
                const nameValue = formElement.querySelector('#name') ? formElement.querySelector('#name').value.trim() : '';
                const emailValue = formElement.querySelector('#email') ? formElement.querySelector('#email').value.trim() : '';
                const passwordValue = formElement.querySelector('#password') ? formElement.querySelector('#password').value : '';
                const passwordConfirmationValue = formElement.querySelector('#password_confirmation') ? formElement.querySelector('#password_confirmation').value : '';

                const payload = {
                    name: nameValue,
                    email: emailValue,
                    password: passwordValue,
                    password_confirmation: passwordConfirmationValue // Backend Laravel sẽ dùng trường này với rule 'confirmed'
                };

                // Gọi hàm onSubmit nếu được định nghĩa trong options, nếu không thì gọi callSignup
                if (typeof options.onSubmit === 'function') {
                    options.onSubmit(payload); // Cho phép tùy chỉnh hành động submit
                } else {
                    callSignup(payload); // Mặc định gọi callSignup
                }
            } else {
                console.log('Form không hợp lệ, vui lòng kiểm tra lại các trường.');
                // Có thể thêm thông báo chung cho người dùng ở đây nếu muốn
            }
        };

        /* ====== VALIDATE REALTIME (KHI BLUR HOẶC INPUT) ====== */
        options.rules.forEach(function (rule) {
            // Lưu các hàm test của rule vào selectorRules
            if (Array.isArray(selectorRules[rule.selector])) {
                selectorRules[rule.selector].push(rule.test);
            } else {
                selectorRules[rule.selector] = [rule.test];
            }

            var inputElement = formElement.querySelector(rule.selector);
            if (inputElement) {
                var formGroupElement = getParent(inputElement, options.formGroupSelector);
                var errorElement = formGroupElement ? formGroupElement.querySelector(options.errorSelector) : null;

                if (formGroupElement && errorElement) {
                    // Validate khi người dùng blur ra khỏi input
                    inputElement.onblur = function () {
                        validate(inputElement, formGroupElement, errorElement, rule);
                    };

                    // Xóa thông báo lỗi khi người dùng bắt đầu nhập liệu
                    inputElement.oninput = function () {
                        errorElement.innerText = '';
                        formGroupElement.classList.remove('invalid');
                    };
                }
            }
        });
    }
}

/* ==============================
   Định nghĩa các Rule cho Validator
   ============================== */

// Rule: Bắt buộc nhập
Validator.isRequired = function (selector, message) {
    return {
        selector: selector,
        test: function (value) {
            return value.trim() ? undefined : message || 'Vui lòng nhập trường này.';
        }
    };
};

// Rule: Phải là email
Validator.isEmail = function (selector, message) {
    return {
        selector: selector,
        test: function (value) {
            var regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
            return regex.test(value) ? undefined : message || 'Trường này phải là email hợp lệ.';
        }
    };
};

// Rule: Độ dài tối thiểu
Validator.minLength = function (selector, min, message) {
    return {
        selector: selector,
        test: function (value) {
            return value.length >= min ? undefined : message || `Vui lòng nhập ít nhất ${min} ký tự.`;
        }
    };
};

// Rule: Xác nhận giá trị (dùng cho password confirmation)
// Cần truyền vào hàm getConfirmValue để lấy giá trị gốc cần so sánh
Validator.isConfirmed = function (selector, getConfirmValueSelector, message) {
    return {
        selector: selector,
        test: function (value, originalPasswordValue) { // Nhận thêm originalPasswordValue
            return value === originalPasswordValue ? undefined : message || 'Giá trị nhập lại không chính xác.';
        }
    };
};


/* ==============================
   Khởi tạo Validator cho Form Đăng Ký
   (Phải được gọi SAU KHI DOM đã tải hoàn chỉnh)
   ============================== */
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra xem có form #form-1 (form đăng ký) trên trang không
    if (document.getElementById('form-1')) {
        Validator({
            form: '#form-1', // Selector của form
            formGroupSelector: '.form-group', // Selector của mỗi group chứa label, input, message
            errorSelector: '.form-message',   // Selector của thẻ hiển thị lỗi
            rules: [
                Validator.isRequired('#name', 'Vui lòng nhập họ tên của bạn.'),
                Validator.isEmail('#email', 'Email không đúng định dạng.'),
                Validator.isRequired('#email', 'Vui lòng nhập email.'), // Có thể gộp message nếu muốn
                Validator.minLength('#password', 6, 'Mật khẩu phải chứa ít nhất 6 ký tự.'),
                Validator.isRequired('#password_confirmation', 'Vui lòng nhập lại mật khẩu.'),
                // Rule isConfirmed sẽ so sánh giá trị của #password_confirmation với #password
                Validator.isConfirmed('#password_confirmation', '#password', 'Mật khẩu nhập lại không khớp.')
            ],
            // Bạn có thể cung cấp hàm onSubmit tùy chỉnh ở đây nếu không muốn dùng callSignup mặc định
            // onSubmit: function(data) {
            //   console.log("Dữ liệu form hợp lệ:", data);
            //   // Gọi hàm xử lý riêng của bạn
            //   myCustomSignupHandler(data);
            // }
        });
    }

    const globalLogoutButton = document.getElementById('global-logout-button'); // Giả sử có nút logout chung
    if (globalLogoutButton) {
        globalLogoutButton.addEventListener('click', async function() {
            // Gọi API logout của server trước
            const token = getAuthToken();
            if (token) {
                try {
                    const response = await fetch(`${API_BASE}/api/logout`, {
                        method: 'POST',
                        headers: getAuthHeaders()
                    });
                    if (response.ok) {
                        console.log('Successfully logged out from server.');
                    } else {
                        console.error('Server logout failed.', await response.json());
                    }
                } catch (error) {
                    console.error('Error calling server logout API:', error);
                }
            }
            // Sau đó luôn thực hiện logout ở client
            logoutClientSide();
        });
    }

    // Kiểm tra trạng thái đăng nhập và cập nhật UI (ví dụ: hiển thị tên người dùng)
    const loggedInUser = getAuthUser();
    const userDisplayElement = document.getElementById('user-display-name'); // Ví dụ
    if (loggedInUser && userDisplayElement) {
        userDisplayElement.textContent = `Xin chào, ${loggedInUser.name}`;
        if(globalLogoutButton) globalLogoutButton.style.display = 'inline-block'; // Hiện nút logout
    } else {
        if(globalLogoutButton) globalLogoutButton.style.display = 'none'; // Ẩn nút logout
    }
});
