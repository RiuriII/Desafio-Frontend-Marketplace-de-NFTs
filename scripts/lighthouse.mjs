import { mkdir, writeFile } from 'node:fs/promises'
import { platform, release, cpus } from 'node:os'
import { createRequire } from 'node:module'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { chromium } from '@playwright/test'
import { preview } from 'vite'
import config from './lighthouse.config.mjs'

const require = createRequire(import.meta.url)
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
await mkdir(config.outputDirectory, { recursive: true })
const server = await preview({ preview: { host: '127.0.0.1', port: config.port, strictPort: true } })
let chrome
let browser
try {
  chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless', '--disable-dev-shm-usage'] })
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`)
  const context = browser.contexts()[0]
  if (!context) throw new Error('Contexto padrão do Chromium não encontrado')
  async function warmMockWorker() {
    const warmup = await context.newPage()
    try {
      await warmup.goto(`http://127.0.0.1:${config.port}/health`)
      await warmup.getByText('API REST: ok').waitFor({ timeout: 20_000 })
    } finally { await warmup.close() }
  }
  const results = []
  for (const path of config.paths) {
    for (const profile of config.profiles) {
      const runs = []
      for (let run = 1; run <= config.runs; run++) {
        let result
        let attempts = 0
        for (let attempt = 1; attempt <= 3; attempt++) {
          attempts = attempt
          await warmMockWorker()
          const candidate = await lighthouse(`http://127.0.0.1:${config.port}${path}`, {
            port: chrome.port,
            output: ['html', 'json'],
            logLevel: 'error',
            pauseAfterLoadMs: config.pauseAfterLoadMs,
            disableStorageReset: true,
            ...(profile === 'desktop' ? { preset: 'desktop' } : {}),
          })
          if (!candidate || candidate.lhr.runtimeError) continue
          const lcpDetails = JSON.stringify(candidate.lhr.audits['lcp-breakdown-insight']?.details ?? '')
          if (path.includes('/nfts/') && !lcpDetails.includes('detail-art')) continue
          result = candidate
          break
        }
        if (!result) throw new Error(`A página não ficou pronta em três tentativas: ${path} ${profile} ${run}`)
        const name = `${path.replace(/[^a-z0-9]/gi, '_')}-${profile}-${run}`
        await writeFile(`${config.outputDirectory}/${name}.html`, result.report[0])
        await writeFile(`${config.outputDirectory}/${name}.json`, result.report[1])
        const lhr = result.lhr
        runs.push({
          attempts,
          categories: Object.fromEntries(Object.entries(lhr.categories).map(([key, category]) => [key, category.score])),
          lcp: lhr.audits['largest-contentful-paint'].numericValue,
          cls: lhr.audits['cumulative-layout-shift'].numericValue,
          tbt: lhr.audits['total-blocking-time'].numericValue,
        })
      }
      results.push({ path, profile, runs, median: {
        categories: Object.fromEntries(Object.keys(runs[0].categories).map((key) => [key, median(runs.map((run) => run.categories[key]))])),
        lcp: median(runs.map((run) => run.lcp)),
        cls: median(runs.map((run) => run.cls)),
        tbt: median(runs.map((run) => run.tbt)),
      } })
    }
  }
  await writeFile(`${config.outputDirectory}/summary.json`, JSON.stringify({
    date: new Date().toISOString(),
    environment: { node: process.version, os: `${platform()} ${release()}`, cpu: cpus()[0]?.model,
      lighthouse: require('lighthouse/package.json').version, playwright: require('@playwright/test/package.json').version },
    conditions: `Build demo, MSW default, Chromium headless, perfis padrão do Lighthouse, service worker preparado via /health antes de cada execução, storage preservado durante medições, pausa de ${config.pauseAfterLoadMs} ms após load, até três tentativas para descartar capturas incompletas do detalhe.`,
    config, results,
  }, null, 2))
  console.log(`Relatórios em ${config.outputDirectory}`)
} finally {
  if (browser) await browser.close()
  if (chrome) await chrome.kill()
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()))
}
