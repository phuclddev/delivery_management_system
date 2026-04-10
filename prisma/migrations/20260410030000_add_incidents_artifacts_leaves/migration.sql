CREATE TABLE `incidents` (
  `id` VARCHAR(191) NOT NULL,
  `incident_code` VARCHAR(191) NOT NULL,
  `project_id` VARCHAR(191) NOT NULL,
  `found_at` DATETIME(3) NOT NULL,
  `severity` VARCHAR(191) NOT NULL,
  `domain` VARCHAR(191) NOT NULL,
  `impact_description` LONGTEXT NOT NULL,
  `resolvers` LONGTEXT NULL,
  `background` LONGTEXT NULL,
  `solution` LONGTEXT NULL,
  `processing_minutes` INTEGER NULL,
  `tag` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL,
  `owner_member_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `incidents_incident_code_key` (`incident_code`),
  INDEX `incidents_project_id_idx` (`project_id`),
  INDEX `incidents_found_at_idx` (`found_at`),
  INDEX `incidents_severity_idx` (`severity`),
  INDEX `incidents_status_idx` (`status`),
  INDEX `incidents_owner_member_id_idx` (`owner_member_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `project_artifacts` (
  `id` VARCHAR(191) NOT NULL,
  `project_id` VARCHAR(191) NOT NULL,
  `artifact_type` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `content_text` LONGTEXT NULL,
  `file_url` VARCHAR(191) NULL,
  `mime_type` VARCHAR(191) NULL,
  `uploaded_by` VARCHAR(191) NULL,
  `is_final` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `project_artifacts_project_id_idx` (`project_id`),
  INDEX `project_artifacts_artifact_type_idx` (`artifact_type`),
  INDEX `project_artifacts_uploaded_by_idx` (`uploaded_by`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `member_leaves` (
  `id` VARCHAR(191) NOT NULL,
  `member_id` VARCHAR(191) NOT NULL,
  `leave_type` VARCHAR(191) NOT NULL,
  `start_date` DATETIME(3) NOT NULL,
  `end_date` DATETIME(3) NOT NULL,
  `note` LONGTEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `member_leaves_member_id_idx` (`member_id`),
  INDEX `member_leaves_start_date_end_date_idx` (`start_date`, `end_date`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `incidents`
  ADD CONSTRAINT `incidents_project_id_fkey`
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT `incidents_owner_member_id_fkey`
  FOREIGN KEY (`owner_member_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `project_artifacts`
  ADD CONSTRAINT `project_artifacts_project_id_fkey`
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT `project_artifacts_uploaded_by_fkey`
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `member_leaves`
  ADD CONSTRAINT `member_leaves_member_id_fkey`
  FOREIGN KEY (`member_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

