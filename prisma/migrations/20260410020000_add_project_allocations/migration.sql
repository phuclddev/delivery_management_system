CREATE TABLE `project_allocations` (
  `id` VARCHAR(191) NOT NULL,
  `member_id` VARCHAR(191) NOT NULL,
  `project_id` VARCHAR(191) NOT NULL,
  `role_type` VARCHAR(191) NOT NULL,
  `allocation_pct` INTEGER NOT NULL,
  `planned_md` DOUBLE NULL,
  `actual_md` DOUBLE NULL,
  `start_date` DATETIME(3) NOT NULL,
  `end_date` DATETIME(3) NOT NULL,
  `priority_weight` INTEGER NULL,
  `is_primary` BOOLEAN NOT NULL DEFAULT false,
  `note` LONGTEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `project_allocations_member_id_idx` (`member_id`),
  INDEX `project_allocations_project_id_idx` (`project_id`),
  INDEX `project_allocations_start_date_end_date_idx` (`start_date`, `end_date`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `project_allocations`
  ADD CONSTRAINT `project_allocations_member_id_fkey`
  FOREIGN KEY (`member_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT `project_allocations_project_id_fkey`
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

