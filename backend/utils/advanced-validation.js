/**
 * Advanced Validation Utilities
 * Additional security checks and business logic validation
 */

/**
 * Validate amount is positive and within reasonable limits
 * @param {number} amount - Amount to validate
 * @param {number} min - Minimum allowed
 * @param {number} max - Maximum allowed
 * @returns {Object} { valid: boolean, error: string|null }
 */
export const validateAmount = (amount, min = 0.01, max = 1000000) => {
  if (typeof amount !== 'number') {
    return { valid: false, error: 'Amount must be a number' };
  }

  if (isNaN(amount)) {
    return { valid: false, error: 'Amount is not a valid number' };
  }

  if (amount <= 0) {
    return { valid: false, error: 'Amount must be positive' };
  }

  if (amount < min) {
    return { valid: false, error: `Amount must be at least ${min}` };
  }

  if (amount > max) {
    return { valid: false, error: `Amount cannot exceed ${max}` };
  }

  // Check for excessive decimal places (max 2)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return { valid: false, error: 'Amount cannot have more than 2 decimal places' };
  }

  return { valid: true, error: null };
};

/**
 * Validate phone number format (Ghana)
 * @param {string} phoneNumber - Phone number
 * @returns {Object} { valid: boolean, error: string|null }
 */
export const validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }

  const cleaned = phoneNumber.trim();

  // Must be 10 digits starting with 0
  if (!/^0\d{9}$/.test(cleaned)) {
    return { valid: false, error: 'Phone number must be 10 digits starting with 0' };
  }

  // Valid Ghanaian network prefixes
  const validPrefixes = [
    // MTN
    '024', '054', '055', '059',
    // Telecel
    '020', '050',
    // AirtelTigo
    '026', '027', '056', '057'
  ];
  const prefix = cleaned.substring(0, 3);

  if (!validPrefixes.includes(prefix)) {
    return { valid: false, error: 'Invalid Ghana phone number prefix' };
  }

  return { valid: true, error: null };
};

/**
 * Validate network type
 * @param {string} network - Network name
 * @returns {Object} { valid: boolean, error: string|null }
 */
export const validateNetwork = (network) => {
  const validNetworks = ['MTN', 'TELECEL', 'AIRTEL_TIGO'];

  if (!network || typeof network !== 'string') {
    return { valid: false, error: 'Network is required' };
  }

  const upperNetwork = network.toUpperCase();

  if (!validNetworks.includes(upperNetwork)) {
    return { valid: false, error: `Network must be one of: ${validNetworks.join(', ')}` };
  }

  return { valid: true, error: null, network: upperNetwork };
};

/**
 * Validate bank account details
 * @param {Object} accountDetails - Bank account info
 * @returns {Object} { valid: boolean, error: string|null }
 */
export const validateBankAccount = (accountDetails) => {
  if (!accountDetails || typeof accountDetails !== 'object') {
    return { valid: false, error: 'Account details are required' };
  }

  const { bank_name, account_number, account_name } = accountDetails;

  if (!bank_name || bank_name.trim().length < 2) {
    return { valid: false, error: 'Valid bank name is required' };
  }

  if (!account_number || !/^\d{10,12}$/.test(account_number.toString())) {
    return { valid: false, error: 'Account number must be 10-12 digits' };
  }

  if (!account_name || account_name.trim().length < 2) {
    return { valid: false, error: 'Account name is required' };
  }

  return { valid: true, error: null };
};

/**
 * Validate pagination parameters
 * @param {number} limit - Items per page
 * @param {number} offset - Starting position
 * @returns {Object} { valid: boolean, error: string|null, limit: number, offset: number }
 */
export const validatePagination = (limit, offset) => {
  const parsedLimit = parseInt(limit) || 20;
  const parsedOffset = parseInt(offset) || 0;

  if (parsedLimit < 1 || parsedLimit > 100) {
    return { valid: false, error: 'Limit must be between 1 and 100' };
  }

  if (parsedOffset < 0) {
    return { valid: false, error: 'Offset must be non-negative' };
  }

  return { valid: true, error: null, limit: parsedLimit, offset: parsedOffset };
};

/**
 * Validate data plan exists and is active
 * @param {Object} sql - Database connection
 * @param {number} planId - Plan ID
 * @returns {Promise<Object>} { valid: boolean, plan: Object|null, error: string|null }
 */
export const validateDataPlan = async (sql, planId) => {
  const plans = await sql(
    'SELECT * FROM data_plans WHERE id = $1 AND is_active = true',
    [planId]
  );

  if (plans.length === 0) {
    return { valid: false, plan: null, error: 'Data plan not found or inactive' };
  }

  return { valid: true, plan: plans[0], error: null };
};

/**
 * Validate sufficient balance
 * @param {number} currentBalance - Current balance
 * @param {number} requiredAmount - Required amount
 * @returns {Object} { valid: boolean, error: string|null }
 */
export const validateSufficientBalance = (currentBalance, requiredAmount) => {
  if (currentBalance < requiredAmount) {
    return {
      valid: false,
      error: `Insufficient balance. Available: GH₵${currentBalance.toFixed(2)}, Required: GH₵${requiredAmount.toFixed(2)}`
    };
  }

  return { valid: true, error: null };
};

/**
 * Sanitize string for SQL LIKE queries
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
export const sanitizeLikeQuery = (input) => {
  if (!input) return '';
  return input.replace(/[%_\\]/g, '\\$&');
};

/**
 * Validate ID parameter
 * @param {any} id - ID to validate
 * @param {string} name - Name for error message
 * @returns {Object} { valid: boolean, id: number|null, error: string|null }
 */
export const validateId = (id, name = 'ID') => {
  const parsedId = parseInt(id);

  if (isNaN(parsedId) || parsedId <= 0) {
    return { valid: false, id: null, error: `${name} must be a positive integer` };
  }

  return { valid: true, id: parsedId, error: null };
};
