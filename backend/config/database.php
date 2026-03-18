<?php
// backend/config/database.php

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    public $conn;

    public function __construct() {
        // Load environment variables
        $this->host = getenv('DB_HOST') ?: 'srv1846.hstgr.io';
        $this->db_name = getenv('DB_NAME') ?: 'u940592735_dental_clinic';
        $this->username = getenv('DB_USER') ?: 'u940592735_dentalclinic';
        $this->password = getenv('DB_PASSWORD') ?: getenv('DB_PASS') ?: 'Dent4lcl!n!c';
    }

    public function connect() {
        $this->conn = null;
        try {
            $this->conn = new PDO(
                "mysql:host={$this->host};dbname={$this->db_name};charset=utf8",
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $e) {
            die("Database Connection Failed [Host: {$this->host}, DB: {$this->db_name}] Error: " . $e->getMessage());
        }
        return $this->conn;
    }
}

// Usage:
// $database = new Database();
// $db = $database->connect();