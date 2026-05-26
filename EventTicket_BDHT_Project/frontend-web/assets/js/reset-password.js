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
    // FIX: Nếu không ở trang quên mật khẩu (không có các form này) thì dừng lại, tránh lỗi sập JS trang khác
    if (!emailForm || !otpForm || !passwordForm) return;

    emailForm.addEventListener('submit', handleEmailSubmit);
    otpForm.addEventListener('submit', handleOtpSubmit);
    passwordForm.addEventListener('submit', handlePasswordSubmit);

    // OTP input auto-focus & advanced UX
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
        // Auto select on focus for easy overwrite
        input.addEventListener('focus', () => {
            input.select();
        });

        // 1. Handle Keydown (Desktop/Physical keyboard - Intercept & instant move)
        input.addEventListener('keydown', (e) => {
            const key = e.key;

            if (/^[0-9]$/.test(key)) {
                e.preventDefault(); // Block default browser character insertion to avoid any duplication/leakage
                input.value = key; // Set value directly
                
                // Focus next field with a tiny delay to allow browser layout to settle cleanly
                if (index < otpInputs.length - 1) {
                    setTimeout(() => {
                        otpInputs[index + 1].focus();
                    }, 5);
                }
            } else if (key === 'Backspace') {
                e.preventDefault();
                if (input.value) {
                    input.value = '';
                } else if (index > 0) {
                    otpInputs[index - 1].value = '';
                    otpInputs[index - 1].focus();
                }
            } else if (key === 'ArrowLeft' && index > 0) {
                e.preventDefault();
                otpInputs[index - 1].focus();
            } else if (key === 'ArrowRight' && index < otpInputs.length - 1) {
                e.preventDefault();
                otpInputs[index + 1].focus();
            }
        });

        // 2. Handle Input (Mobile virtual keyboards / Fallback - safe filtering & focus)
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            const numValue = value.replace(/\D/g, '');

            if (numValue) {
                // Always overwrite with the very last entered digit to prevent duplicates (e.g. "22" -> "2")
                const singleDigit = numValue.substring(numValue.length - 1);
                e.target.value = singleDigit;

                if (numValue.length > 1) {
                    // Distribution logic for pasted text
                    const digits = numValue.split('');
                    let currentIdx = index;
                    for (let i = 0; i < digits.length && currentIdx < otpInputs.length; i++) {
                        otpInputs[currentIdx].value = digits[i];
                        currentIdx++;
                    }
                    const nextFocusIdx = Math.min(currentIdx, otpInputs.length - 1);
                    otpInputs[nextFocusIdx].focus();
                } else {
                    // Move focus with a tiny delay to prevent keyboard events from leaking
                    if (index < otpInputs.length - 1) {
                        setTimeout(() => {
                            otpInputs[index + 1].focus();
                        }, 5);
                    }
                }
            }
        });

        // 3. Paste Event Handler (Clean & robust clipboard distribution)
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text');
            const numValue = pastedData.replace(/\D/g, '');
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

    const resendLink = document.getElementById('resend-otp-link');
    if (resendLink) {
        resendLink.addEventListener('click', (e) => {
            e.preventDefault();
            resendOtp();
        });
    }
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
    button.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Đang gửi mã OTP...';

    try {
        const response = await window.apiClient.post('/api/vtd/public/auth/forgot-password', { email });

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
        button.innerHTML = 'Gửi mã OTP';
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
    button.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Đang xác thực...';

    try {
        const response = await window.apiClient.post('/api/vtd/public/auth/verify-otp', {
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
        button.innerHTML = 'Xác thực OTP';
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
    button.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Đang đặt lại...';

    try {
        const response = await window.apiClient.post('/api/vtd/public/auth/reset-password', {
            email: resetState.email,
            newPassword,
        });

        if (response && response.message) {
            const successMsg = document.getElementById('success-message');
            if (successMsg) {
                successMsg.textContent = 'Mật khẩu đã được đặt lại thành công!';
                successMsg.classList.add('show');
            } else {
                alert('Mật khẩu đã được đặt lại thành công!');
            }

            setTimeout(() => {
                // FIX: Dùng pageUtils để tránh lỗi mất đường dẫn khi chạy Live Server
                window.location.href = window.pageUtils ? window.pageUtils.resolveUrl('/pages/user/login.html') : '/pages/user/login.html';
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
        button.innerHTML = 'Đặt lại mật khẩu';
    }
}

async function resendOtp() {
    const button = document.getElementById('resend-otp-link');
    if (!button) return;

    button.style.pointerEvents = 'none';
    button.style.opacity = '0.5';
    button.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Đang gửi lại...';

    try {
        const response = await window.apiClient.post('/api/vtd/public/auth/forgot-password', {
            email: resetState.email,
        });

        if (response && response.message) {
            resetState.timerSeconds = response.otpExpiry || 180;

            // Clear OTP inputs
            document.querySelectorAll('.otp-input').forEach(input => input.value = '');
            const firstInput = document.querySelectorAll('.otp-input')[0];
            if (firstInput) firstInput.focus();

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
        button.innerHTML = 'Gửi lại mã OTP';
    }
}

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
                timerEl.classList.add('warning');
            }
            if (resetState.timerSeconds <= 0) {
                stopOtpTimer();
                timerEl.classList.add('expired');
                const btnSubmit = document.getElementById('otp-form').querySelector('.btn-submit');
                if (btnSubmit) btnSubmit.disabled = true;
                showError('otp-error', 'OTP đã hết hạn. Vui lòng gửi lại.');
            }
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
    emailForm.classList.remove('active');
    otpForm.classList.remove('active');
    passwordForm.classList.remove('active');

    // Show target step
    if (to === 1) emailForm.classList.add('active');
    if (to === 2) otpForm.classList.add('active');
    if (to === 3) passwordForm.classList.add('active');

    // Update step indicator
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