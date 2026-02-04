import { PrismaClient } from '@prisma/client'
import { getConnectionPoolConfig, validatePoolConfig, getHealthCheckConfig } from './db-pool'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

/**
 * Initialize Prisma Client with optimized connection pooling
 */
function createPrismaClient() {
  const config = getConnectionPoolConfig()
  
  // Validate configuration
  if (!validatePoolConfig(config)) {
    console.warn('Invalid database pool configuration, using defaults')
  }
  
  // Configure Prisma client with connection pool settings
  const prismaClient = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: config.logQueries
      ? ['query', 'error', 'warn']
      : ['error', 'warn'],
  })
  
  // Add connection pool monitoring in development
  if (process.env.NODE_ENV === 'development') {
    prismaClient.$on('query', (e) => {
      console.log(`Query: ${e.query}`)
      console.log(`Duration: ${e.duration}ms`)
    })
    
    prismaClient.$on('error', (e) => {
      console.error('Prisma Client Error:', e)
    })
    
    prismaClient.$on('warn', (e) => {
      console.warn('Prisma Client Warning:', e)
    })
  }
  
  return prismaClient
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Database health check
 * Returns true if database is healthy, false otherwise
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

/**
 * Gracefully shutdown database connections
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
    console.log('Database disconnected successfully')
  } catch (error) {
    console.error('Error disconnecting database:', error)
    throw error
  }
}

/**
 * Get database connection statistics
 */
export async function getDatabaseStats() {
  try {
    // Get connection count from PostgreSQL
    const result = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT count(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `
    
    return {
      activeConnections: result[0]?.count || 0,
      poolConfig: getConnectionPoolConfig(),
    }
  } catch (error) {
    console.error('Error getting database stats:', error)
    return null
  }
}

// Handle process termination gracefully
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await disconnectDatabase()
  })
  
  process.on('SIGINT', async () => {
    await disconnectDatabase()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    await disconnectDatabase()
    process.exit(0)
  })
}
