-- ================================
-- CLEANUP: Remove Unpaid Purchase Records
-- ================================
-- Deletes all data_purchase and guest_data_purchase transactions
-- where the Paystack payment was never confirmed (status not success/completed).
--
-- WARNING: This is destructive and cannot be undone.
-- Back up your database before running.
-- ================================

-- Preview what will be deleted (run this first to verify)
SELECT id, type, status, amount, reference, created_at
FROM transactions
WHERE type IN ('data_purchase', 'guest_data_purchase')
  AND status NOT IN ('success', 'completed')
ORDER BY created_at DESC;

-- ================================
-- AFTER verifying the preview above, run the DELETE below:
-- ================================

DELETE FROM transactions
WHERE type IN ('data_purchase', 'guest_data_purchase')
  AND status NOT IN ('success', 'completed');
