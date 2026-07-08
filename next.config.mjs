const isGithubPages = process.env.GITHUB_PAGES === 'true'
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const basePath = isGithubPages && repositoryName ? `/${repositoryName}` : ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
}

export default nextConfig
