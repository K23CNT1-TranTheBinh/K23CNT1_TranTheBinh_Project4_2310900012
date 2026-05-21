package com.eventticket.service;

import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    private static class OtpData {
        String otp;
        long expiryTime;

        OtpData(String otp, long expiryTime) {
            this.otp = otp;
            this.expiryTime = expiryTime;
        }
    }

    private final Map<String, OtpData> otpCache = new ConcurrentHashMap<>();
    private static final long OTP_VALIDITY_MS = 10 * 60 * 1000; // 10 minutes

    /**
     * Generate 6-digit OTP
     */
    public String generateOtp() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    /**
     * Store OTP for an email
     */
    public void storeOtp(String email, String otp) {
        long expiryTime = System.currentTimeMillis() + OTP_VALIDITY_MS;
        otpCache.put(email, new OtpData(otp, expiryTime));
    }

    /**
     * Verify OTP for an email
     */
    public boolean verifyOtp(String email, String otp) {
        OtpData data = otpCache.get(email);

        // OTP không tồn tại
        if (data == null) {
            return false;
        }

        // OTP đã hết hạn
        if (System.currentTimeMillis() > data.expiryTime) {
            otpCache.remove(email);
            return false;
        }

        // OTP không khớp
        if (!data.otp.equals(otp)) {
            return false;
        }

        // OTP đúng và còn hạn - xóa OTP
        otpCache.remove(email);
        return true;
    }

    /**
     * Check if OTP exists and is still valid
     */
    public boolean isOtpValid(String email) {
        OtpData data = otpCache.get(email);
        if (data == null) {
            return false;
        }
        if (System.currentTimeMillis() > data.expiryTime) {
            otpCache.remove(email);
            return false;
        }
        return true;
    }

    /**
     * Get remaining time for OTP in seconds
     */
    public long getRemainingTime(String email) {
        OtpData data = otpCache.get(email);
        if (data == null) {
            return 0;
        }
        long remaining = (data.expiryTime - System.currentTimeMillis()) / 1000;
        return Math.max(0, remaining);
    }

    /**
     * Remove OTP for an email
     */
    public void removeOtp(String email) {
        otpCache.remove(email);
    }
}
