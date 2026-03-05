<?php
// backend/php/api/employees.php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../utils/email_helper.php';

$payload = authorize();
$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

// If $path is already defined in index.php, use it. Otherwise calculate it.
if (!isset($path)) {
    $request_uri = $_SERVER['REQUEST_URI'];
    $script_name = dirname($_SERVER['SCRIPT_NAME']);
    $base_path = rtrim($script_name, '/') . '/';
    $path = trim(substr($request_uri, strlen($base_path) - 1), '/');
    $path = explode('?', $path)[0];
}

// Extract ID from path if present (e.g., api/employees/1 or api/employees/1/generate-credentials)
// Support both standard routing and direct access with PATH_INFO
$pathParts = explode('/', trim($path, '/'));
$id = null;
$action = null;

// Find the segment after 'employees' or use the first segment if 'employees' isn't there
$empIndex = array_search('employees', $pathParts);
if ($empIndex !== false) {
    if (isset($pathParts[$empIndex + 1]) && is_numeric($pathParts[$empIndex + 1])) {
        $id = $pathParts[$empIndex + 1];
        if (isset($pathParts[$empIndex + 2])) {
            $action = $pathParts[$empIndex + 2];
        }
    }
} else {
    // If 'employees' is not in path, it might be api/employees.php/1/action
    // The first part after script might be the ID
    foreach ($pathParts as $part) {
        if (is_numeric($part)) {
            $id = $part;
            // The next part would be the action
            $idx = array_search($part, $pathParts);
            if (isset($pathParts[$idx + 1])) {
                $action = $pathParts[$idx + 1];
            }
            break;
        }
    }
}

function normalizeDate($val) {
    if (empty($val)) return null;
    $val = trim($val);
    if (strpos($val, '/') !== false) {
        $parts = explode('/', $val);
        if (count($parts) === 3) {
            return sprintf('%04d-%02d-%02d', $parts[2], $parts[1], $parts[0]);
        }
    }
    $d = date_create($val);
    return $d ? $d->format('Y-m-d') : null;
}

// Seeding logic
function seedEmployeesIfEmpty($db) {
    $count = $db->query("SELECT COUNT(*) FROM employees")->fetchColumn();
    if ($count > 0) return;

    $defaults = [
        ['Dr. Joseph Maaño', 'dentist', '+639987654321', 'doctor@clinic.com', 'Makati City', '2020-01-14', 'Super Admin', 'doctor'],
        ['Almira Maaño', 'assistant', '+639123456789', 'assistant@clinic.com', 'Quezon City', '2021-03-19', 'Admin', 'assistant']
    ];

    foreach ($defaults as $e) {
        $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$e[7]]);
        $user = $stmt->fetch();
        $userId = $user ? $user['id'] : null;
        
        $db->prepare("INSERT INTO employees (user_id, name, position, phone, email, address, dateHired, accessLevel, isCodeUsed) VALUES (?,?,?,?,?,?,?,?,1)")
           ->execute([$userId, $e[0], $e[1], $e[2], $e[3], $e[4], $e[5], $e[6]]);
    }
}

try {
    if ($method === 'GET') {
        if ($id) {
            $stmt = $db->prepare("SELECT e.*, u.username FROM employees e LEFT JOIN users u ON e.user_id = u.id WHERE e.id = ?");
            $stmt->execute([$id]);
            echo json_encode($stmt->fetch());
        } else {
            seedEmployeesIfEmpty($db);
            $stmt = $db->query("SELECT e.*, u.username FROM employees e LEFT JOIN users u ON e.user_id = u.id ORDER BY e.createdAt DESC");
            echo json_encode($stmt->fetchAll());
        }
    } 
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        
        if ($action === 'generate-credentials') {
            $code = bin2hex(random_bytes(4));
            $hashed = password_hash($code, PASSWORD_BCRYPT);
            
            $stmt = $db->prepare("SELECT e.*, u.username FROM employees e LEFT JOIN users u ON e.user_id = u.id WHERE e.id = ?");
            $stmt->execute([$id]);
            $emp = $stmt->fetch();
            
            if (!$emp) {
                http_response_code(404);
                echo json_encode(["error" => "Employee not found"]);
                exit();
            }

            $role = ($emp['position'] === 'dentist' || $emp['position'] === 'assistant_dentist') ? 'doctor' : 'assistant';
            
            if ($emp['user_id']) {
                // Update existing user
                $stmt = $db->prepare("UPDATE users SET password = ?, dateOfBirth = ?, isFirstLogin = 1, accountStatus = 'pending' WHERE id = ?");
                $stmt->execute([$hashed, $emp['dateOfBirth'], $emp['user_id']]);
                $username = $emp['username'];
                $uid = $emp['user_id'];
            } else {
                // Create new user
                $username = strtolower(str_replace(' ', '.', $emp['name'])) . rand(10,99);
                // Check if username exists, if so add more randomness
                $checkStmt = $db->prepare("SELECT id FROM users WHERE username = ?");
                $checkStmt->execute([$username]);
                if ($checkStmt->fetch()) {
                    $username .= rand(100, 999);
                }

                $stmt = $db->prepare("INSERT INTO users (username, password, fullName, email, phone, dateOfBirth, role, position, accessLevel, isFirstLogin, accountStatus) VALUES (?,?,?,?,?,?,?,?,?,1,'pending')");
                $stmt->execute([
                    $username, 
                    $hashed, 
                    $emp['name'], 
                    $emp['email'], 
                    $emp['phone'], 
                    $emp['dateOfBirth'],
                    $role, 
                    $emp['position'], 
                    $emp['accessLevel'] ?? 'Default Accounts'
                ]);
                $uid = $db->lastInsertId();
            }
            
            $db->prepare("UPDATE employees SET user_id = ?, generatedCode = ?, isCodeUsed = 0 WHERE id = ?")
               ->execute([$uid, $code, $id]);
            
            // Send credentials email
            if (!empty($emp['email'])) {
                EmailHelper::sendEmployeeCredentials($emp['email'], $emp['name'], $username, $code);
            }
            
            echo json_encode(["message" => "Credentials generated", "username" => $username, "temporaryPassword" => $code]);
        } else {
            if (empty($data->name)) {
                http_response_code(400);
                echo json_encode(["error" => "Employee name is required"]);
                exit();
            }
            $stmt = $db->prepare("INSERT INTO employees (name, position, phone, email, address, dateOfBirth, dateHired, accessLevel) VALUES (?,?,?,?,?,?,?,?)");
            $stmt->execute([$data->name, $data->position ?? '', $data->phone ?? '', $data->email ?? '', $data->address ?? '', normalizeDate($data->dateOfBirth ?? null), normalizeDate($data->dateHired ?? null), $data->accessLevel ?? 'Default Accounts']);
            echo json_encode(["message" => "Employee added", "id" => $db->lastInsertId()]);
        }
    }
    elseif ($method === 'PUT' && $id) {
        $data = json_decode(file_get_contents("php://input"));
        $db->prepare("UPDATE employees SET name=?, position=?, phone=?, email=?, address=?, dateOfBirth=?, dateHired=?, accessLevel=? WHERE id=?")
           ->execute([$data->name, $data->position, $data->phone, $data->email, $data->address, normalizeDate($data->dateOfBirth), normalizeDate($data->dateHired), $data->accessLevel, $id]);
        echo json_encode(["message" => "Employee updated"]);
    }
    elseif ($method === 'DELETE' && $id) {
        // Get user_id before deleting employee
        $stmt = $db->prepare("SELECT user_id FROM employees WHERE id = ?");
        $stmt->execute([$id]);
        $emp = $stmt->fetch();
        
        $db->prepare("DELETE FROM employees WHERE id = ?")->execute([$id]);
        
        // Also delete associated user if exists
        if ($emp && $emp['user_id']) {
            $db->prepare("DELETE FROM users WHERE id = ?")->execute([$emp['user_id']]);
        }
        
        echo json_encode(["message" => "Employee deleted"]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
