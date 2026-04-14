<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/restaurants.php';
require_once __DIR__ . '/admin.php';
require_once __DIR__ . '/setup.php';

class APIRouter {
    private $method;
    private $path;
    private $request;
    private $headers;
    private $authUser = null;

    public function __construct() {
        // Set CORS headers
        $this->setCORSHeaders();

        // Handle OPTIONS preflight
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }

        $this->method = $_SERVER['REQUEST_METHOD'];
        $this->path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $this->path = preg_replace('#^/+#', '/', $this->path);
        $this->parseRequest();
        $this->extractHeaders();
    }

    private function setCORSHeaders() {
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: ' . CORS_ORIGINS);
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Allow-Credentials: true');
    }

    private function parseRequest() {
        $this->request = [];
        $contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';

        if (strpos($contentType, 'application/json') !== false) {
            $input = file_get_contents('php://input');
            if (!empty($input)) {
                $this->request = json_decode($input, true) ?: [];
            }
        } else {
            $this->request = $_REQUEST;
        }
    }

    private function extractHeaders() {
        $this->headers = [];
        foreach (getallheaders() as $name => $value) {
            $this->headers[$name] = $value;
        }
    }

    private function requireAuth() {
        $this->authUser = JWTHandler::getAuthUser($this->headers);

        if (!$this->authUser) {
            $this->respond(['error' => 'Unauthorized'], 401);
        }
    }

    private function requireAdmin() {
        if (!$this->authUser) {
            $this->respond(['error' => 'Unauthorized'], 401);
        }

        if (!AdminHandler::checkAdminRole($this->authUser['role'])) {
            $this->respond(['error' => 'Forbidden'], 403);
        }
    }

    private function respond($data, $statusCode = null) {
        if (isset($data['code'])) {
            $statusCode = $data['code'];
            unset($data['code']);
        }

        if ($statusCode) {
            http_response_code($statusCode);
        }

        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit();
    }

    public function run() {
        try {
            $this->route();
        } catch (Exception $e) {
            $this->respond(['error' => 'Internal server error'], 500);
        }
    }

    private function route() {
        // Setup endpoint (public)
        if ($this->path === '/' && $this->method === 'GET') {
            $this->handleSetup();
            return;
        }

        // Health check (public)
        if ($this->path === '/health' && $this->method === 'GET') {
            $this->handleHealth();
            return;
        }

        // Auth endpoints
        if ($this->path === '/auth/register' && $this->method === 'POST') {
            $this->handleAuthRegister();
            return;
        }

        if ($this->path === '/auth/login' && $this->method === 'POST') {
            $this->handleAuthLogin();
            return;
        }

        if ($this->path === '/auth/me' && $this->method === 'GET') {
            $this->requireAuth();
            $this->handleAuthMe();
            return;
        }

        // Restaurant endpoints
        if ($this->path === '/restaurants' && $this->method === 'POST') {
            $this->requireAuth();
            $this->handleRestaurantCreate();
            return;
        }

        if ($this->path === '/restaurants' && $this->method === 'GET') {
            $this->requireAuth();
            $this->handleRestaurantList();
            return;
        }

        if (preg_match('#^/restaurants/(\d+)$#', $this->path, $matches) && $this->method === 'GET') {
            $this->requireAuth();
            $this->handleRestaurantGet($matches[1]);
            return;
        }

        if (preg_match('#^/restaurants/(\d+)$#', $this->path, $matches) && $this->method === 'PUT') {
            $this->requireAuth();
            $this->handleRestaurantUpdate($matches[1]);
            return;
        }

        // Admin endpoints
        if ($this->path === '/admin/clients' && $this->method === 'GET') {
            $this->requireAuth();
            $this->requireAdmin();
            $this->handleAdminClients();
            return;
        }

        if ($this->path === '/admin/stats' && $this->method === 'GET') {
            $this->requireAuth();
            $this->requireAdmin();
            $this->handleAdminStats();
            return;
        }

        // All admin endpoints — auth + admin role required
        $adminRoutes = [
            '/admin/users'              => 'handleAdminUsers',
            '/admin/financials'         => 'handleAdminFinancials',
            '/admin/activities'         => 'handleAdminActivities',
            '/admin/invoices'           => 'handleAdminInvoices',
            '/admin/reservations/stats' => 'handleAdminReservationStats',
            '/admin/onboarding'         => 'handleAdminOnboarding',
            '/admin/audit-log'          => 'handleAdminAuditLog',
            '/admin/monitoring'         => 'handleAdminMonitoring',
            '/admin/crm'                => 'handleAdminCRM',
            '/admin/newsletters'        => 'handleAdminNewsletters',
            '/admin/blacklist'          => 'handleAdminBlacklist',
            '/admin/tickets'            => 'handleAdminTickets',
            '/admin/suggestions'        => 'handleAdminSuggestions',
            '/admin/alerts'             => 'handleAdminAlerts',
            '/admin/surveys'            => 'handleAdminSurveys',
        ];

        if (isset($adminRoutes[$this->path]) && $this->method === 'GET') {
            $this->requireAuth();
            $this->requireAdmin();
            $method = $adminRoutes[$this->path];
            $this->$method();
            return;
        }

        // Not found
        $this->respond(['error' => 'Endpoint not found'], 404);
    }

    private function handleSetup() {
        $key = isset($_GET['key']) ? $_GET['key'] : '';

        if (!SetupHandler::validateSetupKey($key)) {
            $this->respond(['error' => 'Invalid setup key'], 403);
        }

        $result = SetupHandler::runSetup();
        $this->respond($result);
    }

    private function handleHealth() {
        $dbConnected = Database::testConnection();

        $response = [
            'status' => 'ok',
            'timestamp' => date('Y-m-d H:i:s'),
            'database' => $dbConnected ? 'connected' : 'disconnected'
        ];

        $statusCode = $dbConnected ? 200 : 503;
        $this->respond($response, $statusCode);
    }

    private function handleAuthRegister() {
        $result = AuthHandler::register($this->request);
        $code = isset($result['code']) ? $result['code'] : 201;
        unset($result['code']);
        $this->respond($result, $code);
    }

    private function handleAuthLogin() {
        $result = AuthHandler::login($this->request);
        $code = isset($result['code']) ? $result['code'] : 200;
        unset($result['code']);
        $this->respond($result, $code);
    }

    private function handleAuthMe() {
        $result = AuthHandler::getMe($this->authUser['user_id']);
        $code = isset($result['code']) ? $result['code'] : 200;
        unset($result['code']);
        $this->respond($result, $code);
    }

    private function handleRestaurantCreate() {
        $result = RestaurantHandler::createRestaurant($this->authUser['user_id'], $this->request);
        $code = isset($result['code']) ? $result['code'] : 201;
        unset($result['code']);
        $this->respond($result, $code);
    }

    private function handleRestaurantList() {
        $result = RestaurantHandler::listRestaurants($this->authUser['user_id']);
        $code = isset($result['code']) ? $result['code'] : 200;
        unset($result['code']);
        $this->respond($result, $code);
    }

    private function handleRestaurantGet($restaurantId) {
        $result = RestaurantHandler::getRestaurant($this->authUser['user_id'], $restaurantId);
        $code = isset($result['code']) ? $result['code'] : 200;
        unset($result['code']);
        $this->respond($result, $code);
    }

    private function handleRestaurantUpdate($restaurantId) {
        $result = RestaurantHandler::updateRestaurant($this->authUser['user_id'], $restaurantId, $this->request);
        $code = isset($result['code']) ? $result['code'] : 200;
        unset($result['code']);
        $this->respond($result, $code);
    }

    private function handleAdminClients() {
        $result = AdminHandler::getClients();
        $code = isset($result['code']) ? $result['code'] : 200;
        unset($result['code']);
        $this->respond($result, $code);
    }

    private function handleAdminStats() {
        $result = AdminHandler::getStats();
        $code = isset($result['code']) ? $result['code'] : 200;
        unset($result['code']);
        $this->respond($result, $code);
    }

    private function _adminRespond($result) {
        $code = isset($result['code']) ? $result['code'] : 200;
        unset($result['code']);
        $this->respond($result, $code);
    }

    private function handleAdminUsers()            { $this->_adminRespond(AdminHandler::getUsers()); }
    private function handleAdminFinancials()        { $this->_adminRespond(AdminHandler::getFinancials()); }
    private function handleAdminActivities()        { $this->_adminRespond(AdminHandler::getActivities()); }
    private function handleAdminInvoices()          { $this->_adminRespond(AdminHandler::getInvoices()); }
    private function handleAdminReservationStats()  { $this->_adminRespond(AdminHandler::getReservationStats()); }
    private function handleAdminOnboarding()        { $this->_adminRespond(AdminHandler::getOnboarding()); }
    private function handleAdminAuditLog()          { $this->_adminRespond(AdminHandler::getAuditLog()); }
    private function handleAdminMonitoring()        { $this->_adminRespond(AdminHandler::getMonitoring()); }
    private function handleAdminCRM()               { $this->_adminRespond(AdminHandler::getCRM()); }
    private function handleAdminNewsletters()        { $this->_adminRespond(AdminHandler::getNewsletters()); }
    private function handleAdminBlacklist()          { $this->_adminRespond(AdminHandler::getBlacklist()); }
    private function handleAdminTickets()            { $this->_adminRespond(AdminHandler::getTickets()); }
    private function handleAdminSuggestions()         { $this->_adminRespond(AdminHandler::getSuggestions()); }
    private function handleAdminAlerts()              { $this->_adminRespond(AdminHandler::getAlerts()); }
    private function handleAdminSurveys()             { $this->_adminRespond(AdminHandler::getSurveys()); }
}

$router = new APIRouter();
$router->run();
