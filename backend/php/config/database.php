<?php
// backend/php/config/database.php
require_once __DIR__ . '/config.php';

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    public $conn;

    public function __construct() {
        $this->host = ($_ENV['DB_HOST'] ?? $_SERVER['DB_HOST'] ?? getenv('DB_HOST')) ?: 'srv1846.hstgr.io';
        $this->db_name = ($_ENV['DB_NAME'] ?? $_SERVER['DB_NAME'] ?? getenv('DB_NAME')) ?: 'u940592735_dental_clinic';
        $this->username = ($_ENV['DB_USER'] ?? $_SERVER['DB_USER'] ?? getenv('DB_USER')) ?: 'u940592735_drjoseph';
        $this->password = ($_ENV['DB_PASSWORD'] ?? $_SERVER['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?? $_ENV['DB_PASS'] ?? $_SERVER['DB_PASS'] ?? getenv('DB_PASS')) ?: 'Dent4lcl!n!c';
    }

    private function log($message) {
        $logFile = dirname(__DIR__) . '/logs/database_debug.log';
        $timestamp = date('Y-m-d H:i:s');
        $formattedMessage = "[$timestamp] $message\n";
        file_put_contents($logFile, $formattedMessage, FILE_APPEND);
    }

    public function getConnection() {
        $this->conn = null;
        $this->log("Attempting to connect to database: $this->db_name on host: $this->host");

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name, 
                $this->username, 
                $this->password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_PERSISTENT => true,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4; SET time_zone = '+00:00';"
                ]
            );
            $this->log("Database connection successful.");
        } catch(PDOException $exception) {
            // Log connection error to standard error log
            $errorMessage = "Connection error: " . $exception->getMessage();
            error_log($errorMessage);
            $this->log("FAILED: $errorMessage");
            
            http_response_code(500);
            echo json_encode([
                "error" => "Database Connection Failed [Host: " . $this->host . ", DB: " . $this->db_name . "]",
                "details" => $exception->getMessage(),
                "host" => $this->host,
                "db" => $this->db_name
            ]);
            exit();
        }

        return $this->conn;
    }
}
?>
