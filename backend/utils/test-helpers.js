/**
 * Test Helpers for Manual QA Testing
 * Use these to test the backend functionality
 */

/**
 * Generate test user data
 */
export const generateTestUser = (index = 1) => {
  return {
    full_name: `Test User ${index}`,
    email: `testuser${index}@example.com`,
    password: `TestPass${index}23`,
    country: 'Ghana'
  };
};

/**
 * Generate test data purchase
 */
export const generateTestDataPurchase = () => {
  return {
    network: 'MTN',
    phone_number: '0244123456',
    data_plan_id: 1,
    amount: 5.00
  };
};

/**
 * Test cases for QA testing
 */
export const TEST_CASES = {
  authentication: [
    {
      name: 'Valid Registration',
      endpoint: '/api/auth-register',
      method: 'POST',
      data: generateTestUser(1),
      expectedStatus: 201
    },
    {
      name: 'Duplicate Email Registration',
      endpoint: '/api/auth-register',
      method: 'POST',
      data: generateTestUser(1),
      expectedStatus: 409
    },
    {
      name: 'Weak Password',
      endpoint: '/api/auth-register',
      method: 'POST',
      data: { ...generateTestUser(2), password: 'weak' },
      expectedStatus: 400
    },
    {
      name: 'Valid Login',
      endpoint: '/api/auth-login',
      method: 'POST',
      data: { email: 'testuser1@example.com', password: 'TestPass123' },
      expectedStatus: 200
    },
    {
      name: 'Invalid Password',
      endpoint: '/api/auth-login',
      method: 'POST',
      data: { email: 'testuser1@example.com', password: 'wrongpassword' },
      expectedStatus: 401
    },
    {
      name: 'Account Lockout (6 failed attempts)',
      endpoint: '/api/auth-login',
      method: 'POST',
      repeat: 6,
      data: { email: 'testuser1@example.com', password: 'wrongpass' },
      expectedFinalStatus: 403
    }
  ],

  payments: [
    {
      name: 'Initialize Payment - Valid Amount',
      endpoint: '/api/payment-initialize',
      method: 'POST',
      requiresAuth: true,
      data: { amount: 1000 },
      expectedStatus: 200
    },
    {
      name: 'Initialize Payment - Amount Too Low',
      endpoint: '/api/payment-initialize',
      method: 'POST',
      requiresAuth: true,
      data: { amount: 50 },
      expectedStatus: 400
    },
    {
      name: 'Initialize Payment - Negative Amount',
      endpoint: '/api/payment-initialize',
      method: 'POST',
      requiresAuth: true,
      data: { amount: -100 },
      expectedStatus: 400
    }
  ],

  dataPurchase: [
    {
      name: 'Purchase Data - Valid',
      endpoint: '/api/data-purchase',
      method: 'POST',
      requiresAuth: true,
      data: generateTestDataPurchase(),
      expectedStatus: 200
    },
    {
      name: 'Purchase Data - Insufficient Balance',
      endpoint: '/api/data-purchase',
      method: 'POST',
      requiresAuth: true,
      data: { ...generateTestDataPurchase(), amount: 999999 },
      expectedStatus: 400
    },
    {
      name: 'Purchase Data - Invalid Phone Number',
      endpoint: '/api/data-purchase',
      method: 'POST',
      requiresAuth: true,
      data: { ...generateTestDataPurchase(), phone_number: '123' },
      expectedStatus: 400
    },
    {
      name: 'Purchase Data - Invalid Network',
      endpoint: '/api/data-purchase',
      method: 'POST',
      requiresAuth: true,
      data: { ...generateTestDataPurchase(), network: 'INVALID' },
      expectedStatus: 400
    }
  ],

  security: [
    {
      name: 'Access Protected Route Without Token',
      endpoint: '/api/wallet-balance',
      method: 'GET',
      requiresAuth: false,
      expectedStatus: 401
    },
    {
      name: 'Access Admin Route as Customer',
      endpoint: '/api/get-analytics',
      method: 'GET',
      requiresAuth: true,
      role: 'customer',
      expectedStatus: 403
    },
    {
      name: 'SQL Injection Attempt in Login',
      endpoint: '/api/auth-login',
      method: 'POST',
      data: { email: "admin' OR '1'='1", password: 'anything' },
      expectedStatus: 401
    },
    {
      name: 'XSS Attempt in Registration',
      endpoint: '/api/auth-register',
      method: 'POST',
      data: { ...generateTestUser(99), full_name: '<script>alert("XSS")</script>' },
      expectedStatus: 201,
      checkResponse: (data) => !data.user.full_name.includes('<script>')
    }
  ],

  // Withdrawal tests removed (reseller feature deprecated)
};

/**
 * Manual test runner (for documentation purposes)
 */
export const printTestInstructions = () => {
  console.log('\n========================================');
  console.log('BACKEND TESTING INSTRUCTIONS');
  console.log('========================================\n');

  console.log('1. Start the backend:');
  console.log('   netlify dev\n');

  console.log('2. Test Registration:');
  console.log('   curl -X POST http://localhost:8888/api/auth-register \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"full_name":"Test User","email":"test@example.com","password":"TestPass123","country":"Ghana"}\'\n');

  console.log('3. Test Login:');
  console.log('   curl -X POST http://localhost:8888/api/auth-login \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"email":"test@example.com","password":"TestPass123"}\'\n');

  console.log('4. Save the token from login response\n');

  console.log('5. Test Protected Endpoint:');
  console.log('   curl -X GET http://localhost:8888/api/wallet-balance \\');
  console.log('     -H "Authorization: Bearer YOUR_TOKEN_HERE"\n');

  console.log('6. Test Data Purchase:');
  console.log('   curl -X POST http://localhost:8888/api/data-purchase \\');
  console.log('     -H "Authorization: Bearer YOUR_TOKEN_HERE" \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"network":"MTN","phone_number":"0244123456","data_plan_id":1,"amount":5.00}\'\n');

  console.log('========================================\n');
};
