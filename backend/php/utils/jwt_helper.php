<?php
// backend/php/utils/jwt_helper.php
require_once dirname(__DIR__) . '/config/config.php';

class JWTHelper {
    private static $secret_key;

    private static function init() {
        self::$secret_key = $_ENV['JWT_SECRET'] ?? 'your-secret-key';
    }

    public static function generate($payload, $expiry = 86400) {
        self::init();
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['exp'] = time() + $expiry;
        $payload_json = json_encode($payload);

        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload_json));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret_key, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function validate($token) {
        self::init();
        $parts = explode('.', $token);
        if (count($parts) != 3) return false;

        $header = $parts[0];
        $payload = $parts[1];
        $signature = $parts[2];

        $valid_signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(hash_hmac('sha256', $header . "." . $payload, self::$secret_key, true)));

        if ($signature !== $valid_signature) return false;

        $payload_decoded = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
        
        if (isset($payload_decoded['exp']) && $payload_decoded['exp'] < time()) {
            return false;
        }

        return $payload_decoded;
    }
}
?>
