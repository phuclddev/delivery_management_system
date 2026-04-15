ALTER TABLE `requests`
  ADD COLUMN `owner_user_id` VARCHAR(191) NULL;

ALTER TABLE `requests`
  ADD INDEX `requests_owner_user_id_idx` (`owner_user_id`);

ALTER TABLE `requests`
  ADD CONSTRAINT `requests_owner_user_id_fkey`
    FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
