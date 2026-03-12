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
        $this->host = $_ENV['DB_HOST'] ?? $_SERVER['DB_HOST'] ?? getenv('DB_HOST') ?? 'localhost';
        $this->db_name = $_ENV['DB_NAME'] ?? $_SERVER['DB_NAME'] ?? getenv('DB_NAME') ?? 'dental_clinic';
        $this->username = $_ENV['DB_USER'] ?? $_SERVER['DB_USER'] ?? getenv('DB_USER') ?? 'root';
        $this->password = $_ENV['DB_PASSWORD'] ?? $_SERVER['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?? '';
    }

    public function getConnection() {
        $this->conn = null;

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
        } catch(PDOException $exception) {
            // Log connection error to standard error log
            error_log("Connection error: " . $exception->getMessage());
            
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
