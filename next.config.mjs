const isGithubPages = process.env.GITHUB_PAGES === 'true'
const isStaticExport = process.env.STATIC_EXPORT === 'true'
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const basePath = isGithubPages && repositoryName ? `/${repositoryName}` : ''
const cdnHost = process.env.NEXT_PUBLIC_IMAGE_CDN_HOST

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isStaticExport ? { output: 'export' } : {}),
  trailingSlash: true,
  images: {
    unoptimized: isStaticExport,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: cdnHost ? [{ protocol: 'https', hostname: cdnHost }] : [],
  },
  ...(isStaticExport ? {} : {
    async headers() {
      return [
        {
          source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico)',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
            ...(cdnHost ? [{ key: 'CDN-Cache-Control', value: 'public, max-age=31536000, immutable' }] : []),
          ],
        },
      ]
    },
  }),
  basePath,
  assetPrefix: cdnHost ? `https://${cdnHost}` : basePath ? `${basePath}/` : undefined,
}

export default nextConfig
