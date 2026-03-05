<?php
// backend/php/middleware/auth_middleware.php
require_once dirname(__DIR__) . '/utils/jwt_helper.php';

function authorize() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';

    if (empty($authHeader)) {
        http_response_code(401);
        echo json_encode(["error" => "Authorization header missing"]);
        exit();
    }

    $token = str_replace('Bearer ', '', $authHeader);
    $payload = JWTHelper::validate($token);

    if (!$payload) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid or expired token"]);
        exit();
    }

    return $payload;
}
?>
