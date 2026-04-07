# R3STO Backend Test Suite

This directory contains comprehensive tests for the R3STO restaurant management system backend using Node.js built-in test runner.

## Files

- **auth.test.js** - Authentication endpoints (register, login, /me, logout, refresh)
- **resas.test.js** - Reservations API (CRUD, status transitions, filtering)
- **db.test.js** - Database schema, indexes, constraints, and seed data

## Running Tests

### Prerequisites
The test suite requires:
- Node.js 18+ (for built-in test runner and fetch)
- All dependencies from package.json installed
- No additional test framework packages needed

### Run All Tests
```bash
cd backend
node --test __tests__/**/*.test.js
```

### Run Specific Test File
```bash
node --test __tests__/auth.test.js
node --test __tests__/resas.test.js
node --test __tests__/db.test.js
```

### Run with Verbose Output
```bash
node --test __tests__/**/*.test.js --verbose
```

## Test Coverage

### Authentication Tests (24 test cases)
- Registration with valid credentials
- Duplicate email rejection
- Password validation (minimum 8 characters)
- Mandatory field validation
- Login with valid credentials
- Invalid password handling
- Nonexistent user handling
- /me endpoint with valid token
- Missing/invalid token rejection
- Malformed header handling
- Logout endpoint
- Token refresh

### Reservations Tests (26 test cases)
- List reservations with pagination
- Filter by date
- Filter by service (svc)
- Authentication requirement
- Create new reservation with all fields
- Create with mandatory field validation
- Default values assignment
- Get single reservation by ID
- 404 handling for missing reservation
- Update reservations with field validation
- Delete reservations
- Status change to valid values
- Valid status transitions (reserved → arrived → done, etc.)
- Invalid status rejection
- Service integration
- Table assignment

### Database Tests (18 test cases)
- All required tables created
- Correct column definitions
- Email unique constraint
- User-restaurant relationship
- Reservation field completeness
- All required indexes present
- Index performance optimization
- Demo restaurant seed data
- Demo user creation
- Salles and tables seeding
- Service configuration seeding
- Foreign key constraint enforcement
- Migration tracking
- Duplicate migration prevention
- Timestamp storage and retrieval
- WAL mode enabled
- Foreign keys enabled

## Test Architecture

Each test file:
1. **Server Lifecycle**: Starts server in `before()`, stops in `after()`
2. **Test Database**: Uses isolated `test.db` file
3. **Environment**: Sets `NODE_ENV=test`, custom `DB_PATH`, `JWT_SECRET`
4. **HTTP Testing**: Uses native `fetch()` API
5. **Assertions**: Uses Node.js `assert` module

### Key Features
- No external dependencies required
- Real HTTP requests to test server
- Database isolation via separate test database
- Automatic cleanup of test database after runs
- Full schema initialization for each test run
- Token-based authentication testing
- CRUD operation coverage
- Status transition validation
- Error case handling

## Database Test Database
The test suite creates a temporary `test.db` file that is:
- Created before tests run
- Initialized with full schema
- Populated with demo data
- Cleaned up after tests complete

## Notes
- Tests use hardcoded port 3001 for the test server
- JWT_SECRET is set to 'test-secret-key' for testing
- Each test file creates its own isolated environment
- Tests are sequential within each file
- Foreign key constraints are enabled for integrity testing
