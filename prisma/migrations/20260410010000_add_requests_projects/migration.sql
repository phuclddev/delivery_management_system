CREATE TABLE `requests` (
  `id` VARCHAR(191) NOT NULL,
  `request_code` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `requester_team_id` VARCHAR(191) NOT NULL,
  `campaign_name` VARCHAR(191) NULL,
  `request_type` VARCHAR(191) NOT NULL,
  `scope_type` VARCHAR(191) NOT NULL,
  `priority` VARCHAR(191) NOT NULL,
  `desired_live_date` DATETIME(3) NULL,
  `brief` LONGTEXT NULL,
  `status` VARCHAR(191) NOT NULL,
  `backend_start_date` DATETIME(3) NULL,
  `backend_end_date` DATETIME(3) NULL,
  `frontend_start_date` DATETIME(3) NULL,
  `frontend_end_date` DATETIME(3) NULL,
  `business_value_score` INTEGER NULL,
  `user_impact_score` INTEGER NULL,
  `urgency_score` INTEGER NULL,
  `value_note` LONGTEXT NULL,
  `comment` LONGTEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `requests_request_code_key` (`request_code`),
  INDEX `requests_requester_team_id_idx` (`requester_team_id`),
  INDEX `requests_status_idx` (`status`),
  INDEX `requests_priority_idx` (`priority`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `projects` (
  `id` VARCHAR(191) NOT NULL,
  `project_code` VARCHAR(191) NOT NULL,
  `request_id` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `requester_team_id` VARCHAR(191) NOT NULL,
  `pm_owner_id` VARCHAR(191) NULL,
  `project_type` VARCHAR(191) NOT NULL,
  `scope_type` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL,
  `business_priority` VARCHAR(191) NOT NULL,
  `risk_level` VARCHAR(191) NULL,
  `requested_live_date` DATETIME(3) NULL,
  `planned_start_date` DATETIME(3) NULL,
  `planned_live_date` DATETIME(3) NULL,
  `actual_start_date` DATETIME(3) NULL,
  `actual_live_date` DATETIME(3) NULL,
  `backend_start_date` DATETIME(3) NULL,
  `backend_end_date` DATETIME(3) NULL,
  `frontend_start_date` DATETIME(3) NULL,
  `frontend_end_date` DATETIME(3) NULL,
  `current_scope_version` VARCHAR(191) NULL,
  `scope_change_count` INTEGER NOT NULL DEFAULT 0,
  `blocker_count` INTEGER NOT NULL DEFAULT 0,
  `incident_count` INTEGER NOT NULL DEFAULT 0,
  `chat_group_url` VARCHAR(191) NULL,
  `repo_url` VARCHAR(191) NULL,
  `notes` LONGTEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `projects_project_code_key` (`project_code`),
  UNIQUE INDEX `projects_request_id_key` (`request_id`),
  INDEX `projects_requester_team_id_idx` (`requester_team_id`),
  INDEX `projects_pm_owner_id_idx` (`pm_owner_id`),
  INDEX `projects_status_idx` (`status`),
  INDEX `projects_business_priority_idx` (`business_priority`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `requests`
  ADD CONSTRAINT `requests_requester_team_id_fkey`
  FOREIGN KEY (`requester_team_id`) REFERENCES `teams`(`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE `projects`
  ADD CONSTRAINT `projects_request_id_fkey`
  FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE,
  ADD CONSTRAINT `projects_requester_team_id_fkey`
  FOREIGN KEY (`requester_team_id`) REFERENCES `teams`(`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE,
  ADD CONSTRAINT `projects_pm_owner_id_fkey`
  FOREIGN KEY (`pm_owner_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

