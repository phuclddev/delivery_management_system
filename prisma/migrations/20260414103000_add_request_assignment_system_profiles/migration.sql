ALTER TABLE `request_assignments`
  ADD COLUMN `work_type` VARCHAR(191) NULL,
  ADD COLUMN `uncertainty_level` INTEGER NULL;

CREATE INDEX `request_assignments_work_type_idx` ON `request_assignments`(`work_type`);
CREATE INDEX `request_assignments_uncertainty_level_idx` ON `request_assignments`(`uncertainty_level`);

CREATE TABLE `request_assignment_system_profiles` (
  `assignment_id` VARCHAR(191) NOT NULL,
  `domain_complexity` INTEGER NULL,
  `integration_count` INTEGER NULL,
  `dependency_level` INTEGER NULL,
  `requirement_clarity` INTEGER NULL,
  `unknown_factor` INTEGER NULL,
  `data_volume` INTEGER NULL,
  `scalability_requirement` INTEGER NULL,
  `security_requirement` INTEGER NULL,
  `external_api_complexity` INTEGER NULL,
  `change_frequency` INTEGER NULL,
  `testing_complexity` INTEGER NULL,
  `timeline_pressure` INTEGER NULL,
  `note` LONGTEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`assignment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `request_assignment_system_profiles`
  ADD CONSTRAINT `request_assignment_system_profiles_assignment_id_fkey`
  FOREIGN KEY (`assignment_id`) REFERENCES `request_assignments`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
