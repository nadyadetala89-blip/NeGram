-- Run only AFTER the NeGramDev account has been registered in this D1 database.
-- This grants the exact username the owner role and NeGram + for one year.
UPDATE users
SET role = 'owner',
    premium_until = MAX(COALESCE(premium_until, 0), CAST((julianday('now', '+365 days') - 2440587.5) * 86400000 AS INTEGER))
WHERE lower(username) = 'negramdev';

-- Verify that exactly the intended account was updated:
SELECT username, role, premium_until
FROM users
WHERE lower(username) = 'negramdev';
