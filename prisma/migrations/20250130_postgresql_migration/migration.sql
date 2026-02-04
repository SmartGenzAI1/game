-- Migration: SQLite to PostgreSQL
-- This migration creates the PostgreSQL schema with optimized indexes

-- Enable UUID extension for CUID support
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create User table
CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT,
    "username" TEXT UNIQUE,
    "email" TEXT UNIQUE,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockoutUntil" TIMESTAMP(3),
    "emailVerificationToken" TEXT UNIQUE,
    "emailVerifiedAt" TIMESTAMP(3),
    "bio" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'default'
);

-- Create Link table
CREATE TABLE "Link" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Link_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create Click table
CREATE TABLE "Click" (
    "id" TEXT PRIMARY KEY,
    "linkId" TEXT NOT NULL,
    "userAgent" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Click_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for User table
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "User_emailVerificationToken_idx" ON "User"("emailVerificationToken");
CREATE INDEX "User_lockoutUntil_idx" ON "User"("lockoutUntil");

-- Create indexes for Link table
CREATE INDEX "Link_userId_idx" ON "Link"("userId");
CREATE INDEX "Link_userId_position_idx" ON "Link"("userId", "position");
CREATE INDEX "Link_isActive_idx" ON "Link"("isActive");
CREATE INDEX "Link_userId_isActive_idx" ON "Link"("userId", "isActive");

-- Create indexes for Click table
CREATE INDEX "Click_linkId_idx" ON "Click"("linkId");
CREATE INDEX "Click_createdAt_idx" ON "Click"("createdAt");

-- Create composite index for analytics queries
CREATE INDEX "Click_linkId_createdAt_idx" ON "Click"("linkId", "createdAt");

-- Create trigger for automatic updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_link_updated_at BEFORE UPDATE ON "Link"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
