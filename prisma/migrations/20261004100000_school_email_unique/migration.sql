-- One member per teacher school address (UserRole.schoolEmail).
CREATE UNIQUE INDEX "UserRole_schoolEmail_key" ON "UserRole"("schoolEmail");
