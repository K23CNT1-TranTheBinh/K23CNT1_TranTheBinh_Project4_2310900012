const resetState = {
    email: null,
    otp: null,
    otpToken: null,
    timerInterval: null,
    timerSeconds: 180, // 3 minutes
};

// Form elements
const emailForm = document.getElementById('email-form');
const otpForm = document.getElementById('otp-form');
const passwordForm = document.getElementById('password-form');

document.addEventListener('DOMContentLoaded', () => {
    attachEventListeners();
});

function attachEventListeners() {
    emailForm.addEventListener('submit', handleEmailSubmit);
    otpForm.addEventListener('submit', handleOtpSubmit);
    passwordForm.addEventListener('submit', handlePasswordSubmit);

    // OTP input auto-focus, paste, and validation enhancements
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
        // Chỉ cho phép nhập số & tự động giới hạn độ dài là 1
        input.addEventListener('input', (e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = val.slice(-1); // Chỉ lấy ký tự số cuối cùng nhập vào

            if (e.target.value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });

        // Xử lý nút xoá ngược Backspace mượt mà như native app
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (!e.target.value && index > 0) {
                    otpInputs[index - 1].value = '';
                    otpInputs[index - 1].focus();
                }
            }
        });

        // Xử lý dán mã (Copy - Paste) 6 số cực kỳ mượt mà
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
            if (/^\d{6}$/.test(pasteData)) {
                otpInputs.forEach((inputField, i) => {
                    inputField.value = pasteData[i];
                });
                otpInputs[5].focus();
                clearError('otp-error');
            }
        });
    });

    document.getElementById('resend-otp-link').addEventListener('click', (e) => {
        e.preventDefault();
        resendOtp();
    });
}

async function handleEmailSubmit(e) {
    e.preventDefault();
    clearError('email-error');

    const email = document.getElementById('email').value.trim();

    if (!email) {
        showError('email-error', 'Vui lòng nhập email');
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('email-error', 'Email không hợp lệ');
        return;
    }

    const button = emailForm.querySelector('.btn-submit');
    button.disabled = true;
    button.textContent = 'Đang gửi...';

    try {
        const response = await window.apiClient.post('/api/nat/public/auth/forgot-password', { email });

        if (response && response.message) {
            resetState.email = email;
            resetState.otpToken = email; // Use email as token identifier
            resetState.timerSeconds = response.otpExpiry || 180;

            switchStep(1, 2);
            startOtpTimer();
        } else {
            showError('email-error', response?.message || 'Không thể gửi OTP. Vui lòng thử lại.');
        }
    } catch (error) {
        console.error('Lỗi gửi OTP:', error);
        const message = getErrorMessage(error);
        showError('email-error', message);
    } finally {
        button.disabled = false;
        button.textContent = 'Gửi mã OTP';
    }
}

async function handleOtpSubmit(e) {
    e.preventDefault();
    clearError('otp-error');

    const otpInputs = document.querySelectorAll('.otp-input');
    const otp = Array.from(otpInputs).map(input => input.value).join('');

    if (otp.length !== 6) {
        showError('otp-error', 'Vui lòng nhập đầy đủ 6 chữ số OTP');
        return;
    }

    if (!/^\d{6}$/.test(otp)) {
        showError('otp-error', 'OTP phải là 6 chữ số');
        return;
    }

    const button = otpForm.querySelector('.btn-submit');
    button.disabled = true;
    button.textContent = 'Đang xác thực...';

    try {
        const response = await window.apiClient.post('/api/nat/public/auth/verify-otp', {
            email: resetState.email,
            otp,
        });

        if (response && response.message) {
            resetState.otp = otp;
            stopOtpTimer();
            switchStep(2, 3);
        } else {
            showError('otp-error', response?.message || 'OTP không hợp lệ');
        }
    } catch (error) {
        console.error('Lỗi xác thực OTP:', error);
        const message = getErrorMessage(error);
        showError('otp-error', message);
    } finally {
        button.disabled = false;
        button.textContent = 'Xác thực OTP';
    }
}

async function handlePasswordSubmit(e) {
    e.preventDefault();
    clearError('password-error');
    clearError('confirm-error');

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!newPassword || newPassword.length < 6) {
        showError('password-error', 'Mật khẩu phải có ít nhất 6 ký tự');
        return;
    }

    if (newPassword !== confirmPassword) {
        showError('confirm-error', 'Mật khẩu xác nhận không khớp');
        return;
    }

    const button = passwordForm.querySelector('.btn-submit');
    button.disabled = true;
    button.textContent = 'Đang đặt lại...';

    try {
        const response = await window.apiClient.post('/api/nat/public/auth/reset-password', {
            email: resetState.email,
            newPassword,
        });

        if (response && response.message) {
            const successMsg = document.getElementById('success-message');
            successMsg.textContent = 'Mật khẩu đã được đặt lại thành công!';
            successMsg.classList.add('show');

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showError('password-error', response?.message || 'Không thể đặt lại mật khẩu');
        }
    } catch (error) {
        console.error('Lỗi đặt lại mật khẩu:', error);
        const message = getErrorMessage(error);
        showError('password-error', message);
    } finally {
        button.disabled = false;
        button.textContent = 'Đặt lại mật khẩu';
    }
}

async function resendOtp() {
    const button = document.getElementById('resend-otp-link');
    button.style.pointerEvents = 'none';
    button.style.opacity = '0.5';
    button.textContent = 'Đang gửi lại...';

    try {
        const response = await window.apiClient.post('/api/nat/public/auth/forgot-password', {
            email: resetState.email,
        });

        if (response && response.message) {
            resetState.timerSeconds = response.otpExpiry || 180;

            // Clear OTP inputs
            document.querySelectorAll('.otp-input').forEach(input => input.value = '');
            document.querySelectorAll('.otp-input')[0].focus();

            startOtpTimer();
            clearError('otp-error');
        } else {
            showError('otp-error', response?.error || 'Không thể gửi lại OTP');
        }
    } catch (error) {
        console.error('Lỗi gửi lại OTP:', error);
        showError('otp-error', getErrorMessage(error));
    } finally {
        button.style.pointerEvents = 'auto';
        button.style.opacity = '1';
        button.textContent = 'Gửi lại mã OTP';
    }
}

function startOtpTimer() {
    if (resetState.timerInterval) clearInterval(resetState.timerInterval);

    resetState.timerInterval = setInterval(() => {
        resetState.timerSeconds--;

        const minutes = Math.floor(resetState.timerSeconds / 60);
        const seconds = resetState.timerSeconds % 60;
        const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.getElementById('timer-value').textContent = display;

        const timerEl = document.getElementById('otp-timer');
        if (resetState.timerSeconds <= 30) {
            timerEl.classList.add('warning');
        }
        if (resetState.timerSeconds <= 0) {
            stopOtpTimer();
            timerEl.classList.add('expired');
            document.getElementById('otp-form').querySelector('.btn-submit').disabled = true;
            showError('otp-error', 'OTP đã hết hạn. Vui lòng gửi lại.');
        }
    }, 1000);
}

function stopOtpTimer() {
    if (resetState.timerInterval) {
        clearInterval(resetState.timerInterval);
        resetState.timerInterval = null;
    }
}

function switchStep(from, to) {
    // Hide current step
    document.getElementById(`email-form`).classList.remove('active');
    document.getElementById(`otp-form`).classList.remove('active');
    document.getElementById(`password-form`).classList.remove('active');

    // Show target step
    if (to === 1) document.getElementById('email-form').classList.add('active');
    if (to === 2) document.getElementById('otp-form').classList.add('active');
    if (to === 3) document.getElementById('password-form').classList.add('active');

    // Update step indicator
    for (let i = 1; i <= 3; i++) {
        const stepEl = document.getElementById(`step-${i}`);
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

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.classList.add('show');
    }
}

function clearError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = '';
        element.classList.remove('show');
    }
}

function getErrorMessage(error) {
    if (!error) return 'Có lỗi xảy ra. Vui lòng thử lại.';
    if (typeof error.message === 'string') {
        if (/404|not found/i.test(error.message)) {
            return 'Email không tìm thấy trong hệ thống.';
        }
        if (/400|bad request/i.test(error.message)) {
            return 'Dữ liệu không hợp lệ.';
        }
        return error.message;
    }
    return 'Có lỗi xảy ra. Vui lòng thử lại.';
}
