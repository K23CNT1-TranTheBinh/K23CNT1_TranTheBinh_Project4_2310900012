/**
 * ----------------------------------------------------------------------------
 *  HỆ THỐNG ĐẶT VÉ SỰ KIỆN BDHT
 * Tệp tin: reset-password.js
 * Chức năng: Vận hành biểu mẫu quy trình quên mật khẩu và cấp lại qua OTP Email
 * Người thực hiện: Sinh viên Nguyễn Anh Tuấn
 * Vai trò: Gửi yêu cầu OTP, xác minh OTP nhập vào, và thiết lập lại mật khẩu mới an toàn
 * ----------------------------------------------------------------------------
 */

// Đối tượng lưu trữ trạng thái quy trình đổi mật khẩu
const resetState = {
    email: null,          // Lưu email người dùng yêu cầu khôi phục
    otp: null,            // Lưu mã OTP đã nhập và xác thực
    otpToken: null,       // Chuỗi token nhận diện phiên làm việc
    timerInterval: null,  // Bộ đếm đếm ngược thời gian hết hạn OTP
    timerSeconds: 180,    // Thời gian hết hạn của OTP (3 phút - 180 giây)
};

// Tham chiếu đến 3 Form tương ứng với 3 bước khôi phục mật khẩu
const emailForm = document.getElementById('email-form');
const otpForm = document.getElementById('otp-form');
const passwordForm = document.getElementById('password-form');

// Lắng nghe sự kiện trang web tải xong toàn bộ cấu trúc giao diện DOM
document.addEventListener('DOMContentLoaded', () => {
    attachEventListeners();
});

/**
 * Liên kết các sự kiện tương tác và hành vi nhập liệu nâng cao cho Form
 */
function attachEventListeners() {
    // Bảo vệ Frontend: Chỉ chạy nếu ở đúng trang quên mật khẩu (tránh lỗi sập JS trang khác)
    if (!emailForm || !otpForm || !passwordForm) return;

    // Lắng nghe submit của cả 3 bước Form
    emailForm.addEventListener('submit', handleEmailSubmit);
    otpForm.addEventListener('submit', handleOtpSubmit);
    passwordForm.addEventListener('submit', handlePasswordSubmit);

    // --- XỬ LÝ NHẬP OTP NÂNG CAO (AUTO-FOCUS & AUTO-SHIFT FOCUS) ---
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {

        // Tự động bôi đen toàn bộ số cũ khi người dùng click vào để dễ ghi đè nhanh
        input.addEventListener('focus', () => {
            input.select();
        });

        // 1. Thao tác trên bàn phím vật lý (Desktop Keydown)
        input.addEventListener('keydown', (e) => {
            const key = e.key;

            if (/^[0-9]$/.test(key)) {
                // Nhập số: Chặn hành vi mặc định và tự điền giá trị để tránh trùng lặp
                e.preventDefault();
                input.value = key;

                // Tự động nhảy sang ô tiếp theo sau 5ms
                if (index < otpInputs.length - 1) {
                    setTimeout(() => {
                        otpInputs[index + 1].focus();
                    }, 5);
                }
            } else if (key === 'Backspace') {
                // Phím xóa lùi Backspace
                e.preventDefault();
                if (input.value) {
                    input.value = '';
                } else if (index > 0) {
                    // Nếu ô hiện tại rỗng, tự xóa ô đằng trước và quay lui focus
                    otpInputs[index - 1].value = '';
                    otpInputs[index - 1].focus();
                }
            } else if (key === 'ArrowLeft' && index > 0) {
                // Phím di chuyển trái
                e.preventDefault();
                otpInputs[index - 1].focus();
            } else if (key === 'ArrowRight' && index < otpInputs.length - 1) {
                // Phím di chuyển phải
                e.preventDefault();
                otpInputs[index + 1].focus();
            }
        });

        // 2. Thao tác trên bàn phím ảo điện thoại di động (Mobile Input)
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            const numValue = value.replace(/\D/g, ''); // Chỉ giữ lại số

            if (numValue) {
                // Chỉ lấy chữ số cuối cùng được nhập
                const singleDigit = numValue.substring(numValue.length - 1);
                e.target.value = singleDigit;

                if (numValue.length > 1) {
                    // Xử lý dán mã (Paste) hàng loạt
                    const digits = numValue.split('');
                    let currentIdx = index;
                    for (let i = 0; i < digits.length && currentIdx < otpInputs.length; i++) {
                        otpInputs[currentIdx].value = digits[i];
                        currentIdx++;
                    }
                    const nextFocusIdx = Math.min(currentIdx, otpInputs.length - 1);
                    otpInputs[nextFocusIdx].focus();
                } else {
                    // Nhảy sang ô tiếp theo
                    if (index < otpInputs.length - 1) {
                        setTimeout(() => {
                            otpInputs[index + 1].focus();
                        }, 5);
                    }
                }
            }
        });

        // 3. Xử lý sự kiện dán mã OTP trực tiếp từ clipboard (Paste Event)
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text');
            const numValue = pastedData.replace(/\D/g, ''); // Lọc lấy các chữ số
            if (numValue) {
                const digits = numValue.split('');
                let currentIdx = index;
                for (let i = 0; i < digits.length && currentIdx < otpInputs.length; i++) {
                    otpInputs[currentIdx].value = digits[i];
                    currentIdx++;
                }
                const nextFocusIdx = Math.min(currentIdx, otpInputs.length - 1);
                otpInputs[nextFocusIdx].focus();
            }
        });
    });

    // Lắng nghe sự kiện click nút gửi lại mã OTP (Resend OTP)
    const resendLink = document.getElementById('resend-otp-link');
    if (resendLink) {
        resendLink.addEventListener('click', (e) => {
            e.preventDefault();
            resendOtp();
        });
    }
}

/**
 * Bước 1: Tiếp nhận email và gửi yêu cầu cấp mã OTP
 */
async function handleEmailSubmit(e) {
    e.preventDefault();
    clearError('email-error');

    const email = document.getElementById('email').value.trim();

    if (!email) {
        showError('email-error', 'Vui lòng nhập địa chỉ email của bạn.');
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('email-error', 'Địa chỉ email nhập vào không đúng định dạng.');
        return;
    }

    const button = emailForm.querySelector('.btn-submit');
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i> Đang gửi mã OTP...';

    try {
        // Gọi API POST gửi email quên mật khẩu về Backend
        const response = await window.apiClient.post('/api/vtd/public/auth/forgot-password', { email });

        if (response && response.message) {
            resetState.email = email;
            resetState.otpToken = email;
            resetState.timerSeconds = response.otpExpiry || 180;

            // Chuyển sang bước 2 (Nhập OTP) và kích hoạt bộ đếm thời gian
            switchStep(1, 2);
            startOtpTimer();
        } else {
            showError('email-error', response?.message || 'Không thể gửi OTP. Vui lòng thử lại sau.');
        }
    } catch (error) {
        console.error('Lỗi khi yêu cầu cấp OTP:', error);
        showError('email-error', getErrorMessage(error));
    } finally {
        button.disabled = false;
        button.innerHTML = 'Gửi mã OTP';
    }
}

/**
 * Bước 2: Thu thập 6 số OTP nhập vào và gửi yêu cầu xác thực OTP
 */
async function handleOtpSubmit(e) {
    e.preventDefault();
    clearError('otp-error');

    const otpInputs = document.querySelectorAll('.otp-input');
    const otp = Array.from(otpInputs).map(input => input.value).join('');

    if (otp.length !== 6) {
        showError('otp-error', 'Vui lòng nhập đầy đủ 6 chữ số mã OTP nhận được.');
        return;
    }

    if (!/^\d{6}$/.test(otp)) {
        showError('otp-error', 'Mã xác thực OTP bắt buộc phải là 6 chữ số.');
        return;
    }

    const button = otpForm.querySelector('.btn-submit');
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i> Đang tiến hành xác thực...';

    try {
        // Gọi API POST gửi OTP xác thực về Backend
        const response = await window.apiClient.post('/api/vtd/public/auth/verify-otp', {
            email: resetState.email,
            otp,
        });

        if (response && response.message) {
            resetState.otp = otp;
            stopOtpTimer();     // Tắt đếm thời gian
            switchStep(2, 3);   // Chuyển sang bước 3 (Đặt mật khẩu mới)
        } else {
            showError('otp-error', response?.message || 'Mã OTP nhập vào không hợp lệ hoặc đã hết hạn.');
        }
    } catch (error) {
        console.error('Lỗi xác thực mã OTP:', error);
        showError('otp-error', getErrorMessage(error));
    } finally {
        button.disabled = false;
        button.innerHTML = 'Xác thực OTP';
    }
}

/**
 * Bước 3: Xác nhận mật khẩu mới và gửi yêu cầu thiết lập mật khẩu mới
 */
async function handlePasswordSubmit(e) {
    e.preventDefault();
    clearError('password-error');
    clearError('confirm-error');

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!newPassword || newPassword.length < 6) {
        showError('password-error', 'Mật khẩu bảo mật bắt buộc phải chứa tối thiểu từ 6 ký tự.');
        return;
    }

    if (newPassword !== confirmPassword) {
        showError('confirm-error', 'Mật khẩu xác nhận không trùng khớp! Hãy kiểm tra lại.');
        return;
    }

    const button = passwordForm.querySelector('.btn-submit');
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i> Đang cập nhật mật khẩu mới...';

    try {
        // Gọi API POST thiết lập mật khẩu mới về Backend
        const response = await window.apiClient.post('/api/vtd/public/auth/reset-password', {
            email: resetState.email,
            newPassword,
        });

        if (response && response.message) {
            const successMsg = document.getElementById('success-message');
            if (successMsg) {
                successMsg.textContent = 'Mật khẩu tài khoản đã được thiết lập lại thành công!';
                successMsg.classList.add('show');
            } else {
                alert('Mật khẩu tài khoản đã được thiết lập lại thành công!');
            }

            // Đợi 2 giây và chuyển hướng về trang Đăng nhập
            setTimeout(() => {
                window.location.href = window.pageUtils ? window.pageUtils.resolveUrl('/pages/user/nat-login.html') : '/pages/user/nat-login.html';
            }, 2000);
        } else {
            showError('password-error', response?.message || 'Không thể thiết lập lại mật khẩu.');
        }
    } catch (error) {
        console.error('Lỗi khi thiết lập mật khẩu mới:', error);
        showError('password-error', getErrorMessage(error));
    } finally {
        button.disabled = false;
        button.innerHTML = 'Đặt lại mật khẩu';
    }
}

/**
 * Gọi lại API gửi yêu cầu cấp mã OTP mới
 */
async function resendOtp() {
    const button = document.getElementById('resend-otp-link');
    if (!button) return;

    button.style.pointerEvents = 'none';
    button.style.opacity = '0.5';
    button.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-1"></i> Đang gửi lại mã...';

    try {
        const response = await window.apiClient.post('/api/vtd/public/auth/forgot-password', {
            email: resetState.email,
        });

        if (response && response.message) {
            resetState.timerSeconds = response.otpExpiry || 180;

            // Xóa sạch các ô nhập OTP cũ để người dùng nhập mã mới
            document.querySelectorAll('.otp-input').forEach(input => input.value = '');
            const firstInput = document.querySelectorAll('.otp-input')[0];
            if (firstInput) firstInput.focus();

            startOtpTimer(); // Đếm lại thời gian
            clearError('otp-error');
        } else {
            showError('otp-error', response?.error || 'Không thể gửi lại mã OTP.');
        }
    } catch (error) {
        console.error('Lỗi khi gửi lại mã OTP:', error);
        showError('otp-error', getErrorMessage(error));
    } finally {
        button.style.pointerEvents = 'auto';
        button.style.opacity = '1';
        button.innerHTML = 'Gửi lại mã OTP';
    }
}

/**
 * Khởi chạy bộ đếm thời gian đếm ngược (Seconds) cho mã OTP hết hạn.
 */
function startOtpTimer() {
    if (resetState.timerInterval) clearInterval(resetState.timerInterval);

    resetState.timerInterval = setInterval(() => {
        resetState.timerSeconds--;

        const minutes = Math.floor(resetState.timerSeconds / 60);
        const seconds = resetState.timerSeconds % 60;
        const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        const timerValueEl = document.getElementById('timer-value');
        if (timerValueEl) timerValueEl.textContent = display;

        const timerEl = document.getElementById('otp-timer');
        if (timerEl) {
            if (resetState.timerSeconds <= 30) {
                timerEl.classList.add('warning'); // Thêm cảnh báo khi còn dưới 30 giây
            }
            if (resetState.timerSeconds <= 0) {
                stopOtpTimer();
                timerEl.classList.add('expired'); // Đã hết hạn
                const btnSubmit = document.getElementById('otp-form').querySelector('.btn-submit');
                if (btnSubmit) btnSubmit.disabled = true; // Vô hiệu hóa nút gửi
                showError('otp-error', 'Mã xác thực OTP đã hết hạn! Vui lòng nhấn nút gửi lại mã.');
            }
        }
    }, 1000);
}

/**
 * Dừng luồng đếm ngược thời gian OTP
 */
function stopOtpTimer() {
    if (resetState.timerInterval) {
        clearInterval(resetState.timerInterval);
        resetState.timerInterval = null;
    }
}

/**
 * Hàm điều phối ẩn hiện giao diện các bước (Step 1, Step 2, Step 3)
 */
function switchStep(from, to) {
    // Ẩn toàn bộ các bước hiện tại
    emailForm.classList.remove('active');
    otpForm.classList.remove('active');
    passwordForm.classList.remove('active');

    // Kích hoạt hiển thị bước được chọn
    if (to === 1) emailForm.classList.add('active');
    if (to === 2) otpForm.classList.add('active');
    if (to === 3) passwordForm.classList.add('active');

    // Đồng bộ hóa trạng thái thanh chỉ thị các bước (Indicator)
    for (let i = 1; i <= 3; i++) {
        const stepEl = document.getElementById(`step-${i}`);
        if (!stepEl) continue;

        if (i < to) {
            stepEl.classList.add('completed');
            stepEl.classList.remove('active');
        } else if (i === to) {
            stepEl.classList.add('active');
            stepEl.classList.remove('completed');
        } else {
            stepEl.classList.remove('active', 'completed');
        }
    }
}

/**
 * Hiển thị lỗi trực quan lên thẻ tương ứng trên Form
 */
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.classList.add('show');
    }
}

/**
 * Xóa bỏ thông điệp lỗi
 */
function clearError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = '';
        element.classList.remove('show');
    }
}

/**
 * Phân tích và dịch mã lỗi mạng thành thông báo dễ hiểu cho người xem.
 */
function getErrorMessage(error) {
    if (!error) return 'Đã xảy ra sự cố mạng, vui lòng thử lại.';
    if (typeof error.message === 'string') {
        if (/404|not found/i.test(error.message)) {
            return 'Email này không tồn tại trong hệ thống tài khoản.';
        }
        if (/400|bad request/i.test(error.message)) {
            return 'Yêu cầu không hợp lệ. Vui lòng xác minh lại dữ liệu.';
        }
        return error.message;
    }
    return 'Gặp sự cố, vui lòng tải lại trang và thực hiện lại.';
}