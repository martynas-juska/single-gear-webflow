import restart from 'vite-plugin-restart'

export default {
    root: 'src/',
    publicDir: '../static/',
    base: './', // 👈 ensures relative paths for assets and models
    server: {
        host: true,
        open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env)
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        sourcemap: false,
        rollupOptions: {
            output: {
                entryFileNames: 'bundle.js', // 👈 single clean file for Webflow
                assetFileNames: 'assets/[name].[ext]'
            }
        }
    },
    plugins: [
        restart({ restart: ['../static/**'] })
    ],
}
