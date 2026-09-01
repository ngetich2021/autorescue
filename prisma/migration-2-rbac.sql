-- CreateTable
CREATE TABLE "PlatformRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlatformMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "inviteEmail" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlatformMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "PlatformRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShopRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShopRole_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShopMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "userId" TEXT,
    "inviteEmail" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShopMember_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShopMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShopMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ShopRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRole_name_key" ON "PlatformRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformMember_userId_key" ON "PlatformMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformMember_inviteEmail_key" ON "PlatformMember"("inviteEmail");

-- CreateIndex
CREATE UNIQUE INDEX "ShopRole_providerId_name_key" ON "ShopRole"("providerId", "name");

-- CreateIndex
CREATE INDEX "ShopMember_userId_idx" ON "ShopMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopMember_providerId_inviteEmail_key" ON "ShopMember"("providerId", "inviteEmail");

