ALTER TABLE `projects`
    DROP FOREIGN KEY `projects_request_id_fkey`;

DROP INDEX `projects_request_id_key` ON `projects`;

ALTER TABLE `projects`
    DROP COLUMN `request_id`;
