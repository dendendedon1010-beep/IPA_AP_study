import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const distDir = path.resolve('dist')
const indexPath = path.join(distDir, 'index.html')
const assetsDir = path.join(distDir, 'assets')

async function verifyDist() {
  await access(indexPath)
  const html = await readFile(indexPath, 'utf8')

  if (html.includes('/src/main.tsx')) {
    throw new Error('dist/index.html still references /src/main.tsx. Vite build output is invalid or GitHub Pages may be serving source files.')
  }

  const hasBuiltAssetReference = /<(?:script|link)\b[^>]+(?:src|href)=["']\/IPA_AP_STUDY\/assets\//i.test(html)
  if (!hasBuiltAssetReference) {
    throw new Error('dist/index.html does not reference a built asset under /IPA_AP_STUDY/assets/.')
  }

  const assets = await readdir(assetsDir, { withFileTypes: true })
  const jsFiles = assets.filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
  if (jsFiles.length === 0) {
    throw new Error('dist/assets does not contain any JavaScript files.')
  }

  console.log(`Verified dist output: ${jsFiles.length} JavaScript file(s) found.`)
}

verifyDist().catch((error) => {
  console.error(`[verify:dist] ${error.message}`)
  process.exit(1)
})
