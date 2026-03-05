<?php
// backend/php/utils/sms_helper.php

/**
 * Send SMS using PhilSMS API
 * @param string $phone - Recipient phone number
 * @param string $message - SMS message content
 * @return array - ['success' => boolean, 'error' => string, 'simulated' => boolean]
 */
function sendSMS($phone, $message) {
    if (empty($phone)) return ['success' => false, 'error' => 'Phone number is required'];

    $apiToken = getenv('PHILSMS_API_TOKEN');
    $senderName = getenv('PHILSMS_SENDER_NAME') ?: 'PhilSMS';

    if (empty($apiToken)) {
        // Log simulation
        error_log("[SIMULATED SMS] To $phone: $message");
        return ['success' => true, 'simulated' => true];
    }

    $cleanPhone = preg_replace('/\D/', '', $phone);
    $recipient = (strpos($cleanPhone, '63') === 0) ? $cleanPhone : '63' . ltrim($cleanPhone, '0');

    $data = [
        'recipient' => $recipient,
        'sender_id' => $senderName,
        'type' => 'plain',
        'message' => $message
    ];

    $ch = curl_init('https://dashboard.philsms.com/api/v3/sms/send');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json',
        'Authorization: Bearer ' . $apiToken
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300) {
        return ['success' => true, 'data' => json_decode($response, true)];
    } else {
        error_log("PhilSMS API Error ($httpCode): " . $response);
        return ['success' => false, 'error' => "API Error: $httpCode", 'details' => $response];
    }
}
?>
