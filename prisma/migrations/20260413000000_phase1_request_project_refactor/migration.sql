ALTER TABLE `requests`
    ADD COLUMN `project_id` VARCHAR(191) NULL;

CREATE INDEX `requests_project_id_idx` ON `requests`(`project_id`);

ALTER TABLE `requests`
    ADD CONSTRAINT `requests_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

CREATE TABLE `project_events` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `request_id` VARCHAR(191) NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `event_title` VARCHAR(191) NOT NULL,
    `event_description` LONGTEXT NULL,
    `event_at` DATETIME(3) NOT NULL,
    `source_type` VARCHAR(191) NULL,
    `metadata_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_events_project_id_event_at_idx`(`project_id`, `event_at`),
    INDEX `project_events_request_id_event_at_idx`(`request_id`, `event_at`),
    INDEX `project_events_actor_user_id_idx`(`actor_user_id`),
    INDEX `project_events_event_type_idx`(`event_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `request_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `request_id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,
    `role_type` VARCHAR(191) NOT NULL,
    `planned_md` DOUBLE NULL,
    `actual_md` DOUBLE NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `status` VARCHAR(191) NULL,
    `note` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `request_assignments_request_id_idx`(`request_id`),
    INDEX `request_assignments_project_id_idx`(`project_id`),
    INDEX `request_assignments_member_id_idx`(`member_id`),
    INDEX `request_assignments_start_date_end_date_idx`(`start_date`, `end_date`),
    INDEX `request_assignments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `request_assignment_fe_profiles` (
    `assignment_id` VARCHAR(191) NOT NULL,
    `screens_views` INTEGER NULL,
    `layout_complexity` INTEGER NULL,
    `component_reuse` INTEGER NULL,
    `responsive` BOOLEAN NULL,
    `animation_level` INTEGER NULL,
    `user_actions` INTEGER NULL,
    `user_actions_list` LONGTEXT NULL,
    `api_complexity` INTEGER NULL,
    `client_side_logic` INTEGER NULL,
    `heavy_assets` BOOLEAN NULL,
    `ui_clarity` INTEGER NULL,
    `spec_change_risk` INTEGER NULL,
    `device_support` INTEGER NULL,
    `timeline_pressure` INTEGER NULL,
    `note` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`assignment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `request_assignment_be_profiles` (
    `assignment_id` VARCHAR(191) NOT NULL,
    `user_actions` INTEGER NULL,
    `business_logic_complexity` INTEGER NULL,
    `db_tables` INTEGER NULL,
    `apis` INTEGER NULL,
    `requirement_clarity` INTEGER NULL,
    `change_frequency` INTEGER NULL,
    `realtime` BOOLEAN NULL,
    `timeline_pressure` INTEGER NULL,
    `note` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`assignment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `project_events`
    ADD CONSTRAINT `project_events_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE `project_events`
    ADD CONSTRAINT `project_events_request_id_fkey`
    FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE `project_events`
    ADD CONSTRAINT `project_events_actor_user_id_fkey`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE `request_assignments`
    ADD CONSTRAINT `request_assignments_request_id_fkey`
    FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE `request_assignments`
    ADD CONSTRAINT `request_assignments_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE `request_assignments`
    ADD CONSTRAINT `request_assignments_member_id_fkey`
    FOREIGN KEY (`member_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE `request_assignment_fe_profiles`
    ADD CONSTRAINT `request_assignment_fe_profiles_assignment_id_fkey`
    FOREIGN KEY (`assignment_id`) REFERENCES `request_assignments`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE `request_assignment_be_profiles`
    ADD CONSTRAINT `request_assignment_be_profiles_assignment_id_fkey`
    FOREIGN KEY (`assignment_id`) REFERENCES `request_assignments`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

UPDATE `requests` AS `r`
INNER JOIN `projects` AS `p`
    ON `p`.`request_id` = `r`.`id`
SET `r`.`project_id` = `p`.`id`
WHERE `r`.`project_id` IS NULL;
