
/** @type {import('next').NextConfig} */
const nextConfig = {
    // Performance optimizations
    compress: true, // Enable gzip compression
    poweredByHeader: false, // Remove X-Powered-By header for security
    reactStrictMode: true, // Enable React strict mode for better error detection
    
    // Observability configuration
    logging: {
        // Log level for server-side logging
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        
        // Enable request logging
        fetches: {
            fullUrl: true,
        },
    },
    
    // Enable metrics collection
    experimental: {
        // Enable server actions tracing
        serverActions: {
            bodySizeLimit: '2mb',
            allowedOrigins: ['localhost:3000'],
        },
        // Optimize package imports
        optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    },
    
    // Image optimization
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
        formats: ['image/avif', 'image/webp'], // Use modern image formats
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // Responsive image sizes
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Thumbnail sizes
        minimumCacheTTL: 60, // Cache images for 60 seconds
    },
    
    // Compiler optimizations
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production' ? {
            exclude: ['error', 'warn'],
        } : false,
    },
    
    // Bundle optimization
    swcMinify: true, // Use SWC for minification (faster than Terser)
    
    // Experimental features for performance and observability
    experimental: {
        optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'], // Optimize package imports
        // Enable server actions tracing
        serverActions: {
            bodySizeLimit: '2mb',
            allowedOrigins: ['localhost:3000'],
        },
    },
    
    // Security headers configuration
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    // Content Security Policy
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
                            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
                            "img-src 'self' data: https: blob:",
                            "font-src 'self' data:",
                            "connect-src 'self' https://api.openai.com",
                            "frame-src 'none'",
                            "object-src 'none'",
                            "base-uri 'self'",
                            "form-action 'self'",
                            "frame-ancestors 'none'",
                            "upgrade-insecure-requests",
                        ].join('; '),
                    },
                    // X-Frame-Options - Prevent clickjacking
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    // X-Content-Type-Options - Prevent MIME type sniffing
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    // Strict-Transport-Security - Enforce HTTPS
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains; preload',
                    },
                    // X-XSS-Protection - Enable XSS filter
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    // Referrer-Policy - Control referrer information
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    // Permissions-Policy - Control browser features
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
                    },
                    // X-DNS-Prefetch-Control - Control DNS prefetching
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'off',
                    },
                    // Cross-Origin-Opener-Policy - Control cross-origin opener
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin',
                    },
                    // Cross-Origin-Resource-Policy - Control cross-origin resource sharing
                    {
                        key: 'Cross-Origin-Resource-Policy',
                        value: 'same-origin',
                    },
                    // Cache control for static assets
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            // API routes - Additional CORS headers
            {
                source: '/api/:path*',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: process.env.ALLOWED_ORIGINS?.split(',')?.[0] || '*',
                    },
                    {
                        key: 'Access-Control-Allow-Methods',
                        value: 'GET, POST, PUT, DELETE, OPTIONS',
                    },
                    {
                        key: 'Access-Control-Allow-Headers',
                        value: 'Content-Type, Authorization, X-Requested-With',
                    },
                    {
                        key: 'Access-Control-Allow-Credentials',
                        value: 'true',
                    },
                    {
                        key: 'Access-Control-Max-Age',
                        value: '86400',
                    },
                ],
            },
            // Static assets - Longer cache time
            {
                source: '/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            // Images - Cache for 1 year
            {
                source: '/_next/image(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
    
    // Redirect HTTP to HTTPS in production
    async redirects() {
        if (process.env.NODE_ENV === 'production') {
            return [
                {
                    source: '/:path*',
                    has: [
                        {
                            type: 'header',
                            key: 'x-forwarded-proto',
                            value: 'http',
                        },
                    ],
                    destination: 'https://:path*',
                    permanent: true,
                },
            ];
        }
        return [];
    },
    
    // Webpack configuration for bundle optimization
    webpack: (config, { isServer }) => {
        // Optimize bundle size
        config.optimization = {
            ...config.optimization,
            splitChunks: {
                chunks: 'all',
                cacheGroups: {
                    default: false,
                    vendors: false,
                    // Vendor chunk
                    vendor: {
                        name: 'vendor',
                        chunks: 'all',
                        test: /node_modules/,
                        priority: 20,
                    },
                    // Common chunk
                    common: {
                        name: 'common',
                        minChunks: 2,
                        chunks: 'all',
                        priority: 10,
                        reuseExistingChunk: true,
                        enforce: true,
                    },
                },
            },
        }
        
        return config
    },
};

export default nextConfig;
