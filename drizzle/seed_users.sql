-- Seed: 5 initial user accounts for FiberGIS
-- Run AFTER all migrations are applied

INSERT INTO `users` (`openId`, `name`, `email`, `passwordHash`, `loginMethod`, `role`, `lastSignedIn`, `createdAt`, `updatedAt`)
VALUES
  ('local_admin1_puliy',  'Admin PULIY',      'puliyforall@gmail.com', '$2b$10$yg8vUGdchdURCU5BBK/NEu01U4zCqxrFV3u0titrRrhE7lWsAmffq', 'email', 'admin', NOW(), NOW(), NOW()),
  ('local_admin2_fiber',  'Admin2 FiberGIS',  'admin2@fibergis.ru',    '$2b$10$OVRTr9x8ogwkXrcrQhll..nAYSz2y0t17U3iS6CgIbpmxOgL61WZq', 'email', 'admin', NOW(), NOW(), NOW()),
  ('local_admin3_fiber',  'Admin3 FiberGIS',  'admin3@fibergis.ru',    '$2b$10$JyZnNJyFKdst3Dvzlb3pI.AeKlSvU.h7ROwq.jPvCU4Nqfayk5A8O', 'email', 'admin', NOW(), NOW(), NOW()),
  ('local_tester1_fiber', 'Tester1',          'tester1@fibergis.ru',   '$2b$10$kja2N3PtvpDGzgAzez0R1OyN67MOkDygKPocvHu8urpo.lwE/vJsm',  'email', 'user',  NOW(), NOW(), NOW()),
  ('local_tester2_fiber', 'Tester2',          'tester2@fibergis.ru',   '$2b$10$5xbu6U3ZK6fuMsjz694YGe8mxH8W5q9zl3OHdtK6beqSJFp7/Xxsq',  'email', 'user',  NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE `updatedAt` = NOW();
