<?php
// backend/php/utils/email_helper.php
require_once dirname(__DIR__) . '/config/config.php';

class EmailHelper {
    /**
     * Send credentials to a new patient
     */
    public static function sendPatientCredentials($email, $fullName, $username, $password) {
        return self::sendCredentials($email, $fullName, $username, $password, 'Patient');
    }

    /**
     * Send credentials to a new employee
     */
    public static function sendEmployeeCredentials($email, $fullName, $username, $password) {
        return self::sendCredentials($email, $fullName, $username, $password, 'Employee');
    }

    private static function sendCredentials($email, $fullName, $username, $password, $type) {
        if (empty($email)) return false;

        $fromEmail = $_ENV['EMAIL_USER'] ?? 'dentalclinic@xn--maaodentalcare-snb.com';
        $subject = "Welcome to Maaño Dental Care - Your $type Account Credentials";
        
        $portalName = ($type === 'Patient') ? 'Patient Portal' : 'Employee Portal';
        
        $message = '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #14b8a6; text-align: center;">Welcome to Maaño Dental Care!</h2>
            <p>Dear <strong>' . htmlspecialchars($fullName) . '</strong>,</p>
            <p>An account has been created for you as a ' . strtolower($type) . ' at Maaño Dental Care. You can now access your portal to manage your information.</p>
            
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; margin-bottom: 10px;"><strong>Your Login Credentials:</strong></p>
                <p style="margin: 0; margin-bottom: 5px;"><strong>Username:</strong> ' . htmlspecialchars($username) . '</p>
                <p style="margin: 0;"><strong>Temporary Password:</strong> ' . htmlspecialchars($password) . '</p>
            </div>
            
            <p>For security reasons, we recommend that you change your password after your first login.</p>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="https://xn--maaodentalcare-snb.com" style="background-color: #14b8a6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to ' . $portalName . '</a>
            </div>
            
            <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #666; text-align: center;">
                This is an automated message. Please do not reply directly to this email.<br />
                If you have any questions, please contact us at (042) 7171156.
            </p>
        </div>';

        // Set content-type header for sending HTML email
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= "From: Maaño Dental Care <" . $fromEmail . ">" . "\r\n";

        $result = mail($email, $subject, $message, $headers);
        if (!$result) {
            error_log("PHP mail() failed to send to $email");
        }
        return $result;
    }
}
?>
