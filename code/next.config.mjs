/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(), // Define explicitamente a raiz do projeto
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // App Router is enabled by default in Next 13+ with the `app/` folder.
  // Removing `experimental.appDir` and `i18n` here because this project
  // uses explicit `app/[locale]` route segments and a custom provider.

}
export default nextConfig
