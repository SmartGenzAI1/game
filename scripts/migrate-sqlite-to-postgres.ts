/**
 * SQLite to PostgreSQL Data Migration Script
 * 
 * This script migrates data from SQLite to PostgreSQL.
 * Run this after setting up the PostgreSQL database.
 * 
 * Usage:
 * 1. Set DATABASE_URL to your PostgreSQL connection string
 * 2. Set SQLITE_DB_PATH to your SQLite database path
 * 3. Run: npx tsx scripts/migrate-sqlite-to-postgres.ts
 */

import { PrismaClient } from '@prisma/client'
import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join } from 'path'

const POSTGRES_URL = process.env.DATABASE_URL
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || './prisma/dev.db'

if (!POSTGRES_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Initialize Prisma clients
const postgresPrisma = new PrismaClient({
  datasources: {
    db: {
      url: POSTGRES_URL,
    },
  },
})

const sqlitePrisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${SQLITE_DB_PATH}`,
    },
  },
})

interface MigrationStats {
  users: number
  links: number
  clicks: number
  errors: string[]
}

const stats: MigrationStats = {
  users: 0,
  links: 0,
  clicks: 0,
  errors: [],
}

async function migrateUsers() {
  console.log('Migrating users...')
  
  const users = await sqlitePrisma.user.findMany()
  
  for (const user of users) {
    try {
      await postgresPrisma.user.create({
        data: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          password: user.password,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          failedLoginAttempts: user.failedLoginAttempts,
          lockoutUntil: user.lockoutUntil,
          emailVerificationToken: user.emailVerificationToken,
          emailVerifiedAt: user.emailVerifiedAt,
          bio: user.bio,
          theme: user.theme,
        },
      })
      stats.users++
    } catch (error) {
      stats.errors.push(`Failed to migrate user ${user.id}: ${error}`)
      console.error(`Failed to migrate user ${user.id}:`, error)
    }
  }
  
  console.log(`✓ Migrated ${stats.users} users`)
}

async function migrateLinks() {
  console.log('Migrating links...')
  
  const links = await sqlitePrisma.link.findMany()
  
  for (const link of links) {
    try {
      await postgresPrisma.link.create({
        data: {
          id: link.id,
          title: link.title,
          url: link.url,
          position: link.position,
          isActive: link.isActive,
          clicks: link.clicks,
          userId: link.userId,
          createdAt: link.createdAt,
          updatedAt: link.updatedAt,
        },
      })
      stats.links++
    } catch (error) {
      stats.errors.push(`Failed to migrate link ${link.id}: ${error}`)
      console.error(`Failed to migrate link ${link.id}:`, error)
    }
  }
  
  console.log(`✓ Migrated ${stats.links} links`)
}

async function migrateClicks() {
  console.log('Migrating clicks...')
  
  const clicks = await sqlitePrisma.click.findMany()
  
  for (const click of clicks) {
    try {
      await postgresPrisma.click.create({
        data: {
          id: click.id,
          linkId: click.linkId,
          userAgent: click.userAgent,
          referrer: click.referrer,
          createdAt: click.createdAt,
        },
      })
      stats.clicks++
    } catch (error) {
      stats.errors.push(`Failed to migrate click ${click.id}: ${error}`)
      console.error(`Failed to migrate click ${click.id}:`, error)
    }
  }
  
  console.log(`✓ Migrated ${stats.clicks} clicks`)
}

async function main() {
  console.log('Starting SQLite to PostgreSQL migration...')
  console.log(`SQLite DB: ${SQLITE_DB_PATH}`)
  console.log(`PostgreSQL URL: ${POSTGRES_URL.replace(/:[^:]+@/, ':****@')}`)
  console.log('---')
  
  try {
    // Test PostgreSQL connection
    await postgresPrisma.$connect()
    console.log('✓ Connected to PostgreSQL')
    
    // Test SQLite connection
    await sqlitePrisma.$connect()
    console.log('✓ Connected to SQLite')
    
    // Check if PostgreSQL already has data
    const existingUsers = await postgresPrisma.user.count()
    if (existingUsers > 0) {
      console.log(`⚠ PostgreSQL already has ${existingUsers} users. Skipping migration.`)
      console.log('If you want to re-migrate, clear the PostgreSQL database first.')
      return
    }
    
    // Migrate data
    await migrateUsers()
    await migrateLinks()
    await migrateClicks()
    
    console.log('---')
    console.log('Migration completed!')
    console.log(`Users: ${stats.users}`)
    console.log(`Links: ${stats.links}`)
    console.log(`Clicks: ${stats.clicks}`)
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠ ${stats.errors.length} errors occurred:`)
      stats.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`)
      })
    }
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await postgresPrisma.$disconnect()
    await sqlitePrisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('\n✓ Migration script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n✗ Migration script failed:', error)
    process.exit(1)
  })
