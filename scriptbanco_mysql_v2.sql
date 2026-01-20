-- =============================================
-- CodeCraft Gen-Z - MySQL Database Script
-- =============================================
-- Database: u984096926_codecraftgenz (Hostinger)
-- Compatible with Prisma schema
-- =============================================

-- Use the database (already created by Hostinger)
USE `u984096926_codecraftgenz`;

-- =============================================
-- USERS & AUTHENTICATION
-- =============================================

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'viewer',
  `status` VARCHAR(50) NOT NULL DEFAULT 'ativo',
  `mfaEnabled` TINYINT(1) NOT NULL DEFAULT 0,
  `mfaSecret` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `tokenHash` VARCHAR(255) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `password_resets_tokenHash_key` (`tokenHash`),
  KEY `password_resets_userId_fkey` (`userId`),
  CONSTRAINT `password_resets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- MENTORS
-- =============================================

CREATE TABLE IF NOT EXISTS `mentores` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NULL,
  `bio` TEXT NULL,
  `especialidade` VARCHAR(255) NULL,
  `avatarUrl` VARCHAR(512) NULL,
  `linkedinUrl` VARCHAR(512) NULL,
  `githubUrl` VARCHAR(512) NULL,
  `disponivel` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- PROJECTS
-- =============================================

CREATE TABLE IF NOT EXISTS `projetos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(255) NOT NULL,
  `descricao` TEXT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'ativo',
  `preco` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `progresso` INT NOT NULL DEFAULT 0,
  `thumbUrl` VARCHAR(512) NULL,
  `mentorId` INT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `projetos_mentorId_fkey` (`mentorId`),
  CONSTRAINT `projetos_mentorId_fkey` FOREIGN KEY (`mentorId`) REFERENCES `mentores` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- APPS & MARKETPLACE
-- =============================================

CREATE TABLE IF NOT EXISTS `apps` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `shortDescription` VARCHAR(500) NULL,
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `category` VARCHAR(100) NULL,
  `tags` TEXT NULL,
  `thumbUrl` VARCHAR(512) NULL,
  `screenshots` TEXT NULL,
  `executableUrl` VARCHAR(512) NULL,
  `version` VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  `status` VARCHAR(50) NOT NULL DEFAULT 'draft',
  `featured` TINYINT(1) NOT NULL DEFAULT 0,
  `downloadCount` INT NOT NULL DEFAULT 0,
  `creatorId` INT NOT NULL,
  `projectId` INT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `apps_creatorId_fkey` (`creatorId`),
  KEY `apps_projectId_fkey` (`projectId`),
  CONSTRAINT `apps_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `apps_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projetos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- PAYMENTS
-- =============================================

CREATE TABLE IF NOT EXISTS `app_payments` (
  `id` VARCHAR(64) NOT NULL,
  `appId` INT NOT NULL,
  `userId` INT NULL,
  `preferenceId` VARCHAR(64) NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'BRL',
  `payerEmail` VARCHAR(255) NULL,
  `payerName` VARCHAR(255) NULL,
  `mpResponseJson` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `app_payments_appId_status_idx` (`appId`, `status`),
  KEY `app_payments_payerEmail_idx` (`payerEmail`),
  KEY `app_payments_userId_fkey` (`userId`),
  CONSTRAINT `app_payments_appId_fkey` FOREIGN KEY (`appId`) REFERENCES `apps` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `app_payments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- LICENSES
-- =============================================

CREATE TABLE IF NOT EXISTS `user_licenses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `appId` INT NOT NULL,
  `userId` INT NULL,
  `email` VARCHAR(255) NOT NULL,
  `hardwareId` VARCHAR(255) NULL,
  `licenseKey` VARCHAR(1024) NULL,
  `appName` VARCHAR(255) NULL,
  `activatedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_licenses_appId_email_idx` (`appId`, `email`),
  KEY `user_licenses_appId_email_hardwareId_idx` (`appId`, `email`, `hardwareId`),
  KEY `user_licenses_userId_fkey` (`userId`),
  CONSTRAINT `user_licenses_appId_fkey` FOREIGN KEY (`appId`) REFERENCES `apps` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_licenses_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `license_activations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `appId` INT NOT NULL,
  `email` VARCHAR(255) NULL,
  `hardwareId` VARCHAR(255) NULL,
  `licenseId` INT NULL,
  `action` VARCHAR(50) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `message` VARCHAR(500) NULL,
  `ip` VARCHAR(64) NULL,
  `userAgent` VARCHAR(512) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `license_activations_appId_email_idx` (`appId`, `email`),
  KEY `license_activations_hardwareId_idx` (`hardwareId`),
  KEY `license_activations_licenseId_fkey` (`licenseId`),
  CONSTRAINT `license_activations_licenseId_fkey` FOREIGN KEY (`licenseId`) REFERENCES `user_licenses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- CRAFTERS & TEAMS
-- =============================================

CREATE TABLE IF NOT EXISTS `equipes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(255) NOT NULL,
  `descricao` TEXT NULL,
  `logoUrl` VARCHAR(512) NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'ativo',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `crafters` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NULL,
  `bio` TEXT NULL,
  `avatarUrl` VARCHAR(512) NULL,
  `githubUrl` VARCHAR(512) NULL,
  `linkedinUrl` VARCHAR(512) NULL,
  `skillsJson` TEXT NULL,
  `pontos` INT NOT NULL DEFAULT 0,
  `equipeId` INT NULL,
  `userId` INT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `crafters_userId_key` (`userId`),
  KEY `crafters_equipeId_fkey` (`equipeId`),
  CONSTRAINT `crafters_equipeId_fkey` FOREIGN KEY (`equipeId`) REFERENCES `equipes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `crafters_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ranking_top3` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `crafterId` INT NOT NULL,
  `position` INT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ranking_top3_crafterId_fkey` (`crafterId`),
  CONSTRAINT `ranking_top3_crafterId_fkey` FOREIGN KEY (`crafterId`) REFERENCES `crafters` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- INSCRIPTIONS
-- =============================================

CREATE TABLE IF NOT EXISTS `inscricoes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `telefone` VARCHAR(50) NULL,
  `mensagem` TEXT NULL,
  `projetoId` INT NULL,
  `tipo` VARCHAR(50) NOT NULL DEFAULT 'geral',
  `status` VARCHAR(50) NOT NULL DEFAULT 'pendente',
  `notas` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `inscricoes_projetoId_fkey` (`projetoId`),
  CONSTRAINT `inscricoes_projetoId_fkey` FOREIGN KEY (`projetoId`) REFERENCES `projetos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- CHALLENGES
-- =============================================

CREATE TABLE IF NOT EXISTS `desafios` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `objective` VARCHAR(500) NULL,
  `description` TEXT NULL,
  `difficulty` VARCHAR(50) NOT NULL DEFAULT 'medio',
  `deadline` DATETIME(3) NULL,
  `reward` DECIMAL(10, 2) NULL,
  `basePoints` INT NOT NULL DEFAULT 100,
  `tagsJson` TEXT NULL,
  `deliveryType` VARCHAR(50) NOT NULL DEFAULT 'link',
  `thumbUrl` VARCHAR(512) NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `visible` TINYINT(1) NOT NULL DEFAULT 1,
  `createdBy` INT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `challenge_submissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `desafioId` INT NOT NULL,
  `oderId` INT NOT NULL,
  `deliveryUrl` VARCHAR(512) NULL,
  `deliveryText` TEXT NULL,
  `notes` TEXT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'subscribed',
  `score` INT NULL,
  `reviewFeedback` TEXT NULL,
  `submittedAt` DATETIME(3) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `challenge_submissions_desafioId_oderId_key` (`desafioId`, `oderId`),
  KEY `challenge_submissions_oderId_fkey` (`oderId`),
  CONSTRAINT `challenge_submissions_desafioId_fkey` FOREIGN KEY (`desafioId`) REFERENCES `desafios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `challenge_submissions_oderId_fkey` FOREIGN KEY (`oderId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- FEEDBACK
-- =============================================

CREATE TABLE IF NOT EXISTS `feedbacks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NULL,
  `appId` INT NULL,
  `rating` INT NOT NULL,
  `comment` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `feedbacks_userId_fkey` (`userId`),
  KEY `feedbacks_appId_fkey` (`appId`),
  CONSTRAINT `feedbacks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `feedbacks_appId_fkey` FOREIGN KEY (`appId`) REFERENCES `apps` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- END OF SCRIPT
-- =============================================
