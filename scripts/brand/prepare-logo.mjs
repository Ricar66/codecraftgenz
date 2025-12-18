import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import potrace from 'potrace'

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const [k, v] = a.split('=')
      const key = k.replace(/^--/, '')
      if (v !== undefined) args[key] = v
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        args[key] = argv[i + 1]
        i++
      } else {
        args[key] = true
      }
    }
  }
  return args
}

async function removeWhiteBackgroundToPNG(inputPath, outputPath, threshold = 250) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const ch = info.channels // expect 4
  const out = Buffer.alloc(data.length)
  for (let i = 0; i < data.length; i += ch) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = ch > 3 ? data[i + 3] : 255
    const isNearWhite = r >= threshold && g >= threshold && b >= threshold
    out[i] = r
    out[i + 1] = g
    out[i + 2] = b
    out[i + 3] = isNearWhite ? 0 : a
  }
  // upscale e limpeza suave para melhor vetor
  const png = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize({ width: info.width * 2, height: info.height * 2, kernel: 'lanczos3' })
    .median(1)
    .png({ compressionLevel: 9 })
    .toBuffer()
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, png)
}

async function rasterToSVG(pngPath, svgPath) {
  const t = new potrace.Potrace()
  const params = { turdSize: 2, threshold: 128, blackOnWhite: false, optTolerance: 0.3 }
  await new Promise((resolve, reject) => {
    t.loadImage(pngPath, function (err) {
      if (err) return reject(err)
      t.setParameters(params)
      t.getSVG(function (err2, svg) {
        if (err2) return reject(err2)
        const enhanced = enhanceSVG(svg)
        fs.mkdirSync(path.dirname(svgPath), { recursive: true })
        fs.writeFileSync(svgPath, enhanced, 'utf8')
        resolve()
      })
    })
  })
}

function enhanceSVG(svgStr, start = '#C6007E', end = '#FF4FB3') {
  let s = svgStr
  // garantir viewBox e namespace
  s = s.replace(/<svg([^>]*?)>/, (m, attrs) => {
    const hasViewBox = /viewBox=/.test(attrs)
    const newAttrs = `${attrs} xmlns="http://www.w3.org/2000/svg"${hasViewBox ? '' : ' viewBox="0 0 1024 512"'}`
    return `<svg${newAttrs}>`
  })
  // defs com gradiente e sombra
  const defs = `
    <defs>
      <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${start}" />
        <stop offset="100%" stop-color="${end}" />
      </linearGradient>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
        <feOffset in="blur" dx="0" dy="2" result="offsetBlur"/>
        <feMerge>
          <feMergeNode in="offsetBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
  `
  s = s.replace(/<svg[^>]*?>/, m => `${m}${defs}`)
  // substituir fills por gradiente e aplicar filtro
  s = s.replace(/fill="[^"]*"/g, 'fill="url(#brandGrad)"')
  s = s.replace(/<path /g, '<path filter="url(#softShadow)" ')
  return s
}

async function main() {
  const args = parseArgs(process.argv)
  const input = args.input || args.i
  const outPng = args.outPng || path.join('src', 'assets', 'logo-codecraft.png')
  const outSvg = args.outSvg || path.join('src', 'assets', 'logo-codecraft.svg')
  const threshold = args.threshold ? Number(args.threshold) : 250
  if (!input) {
    console.error('Uso: node scripts/brand/prepare-logo.mjs --input <arquivo> [--outPng <png>] [--outSvg <svg>] [--threshold <0-255>]')
    process.exit(1)
  }
  if (!fs.existsSync(input)) {
    console.error(`Arquivo de entrada não encontrado: ${input}`)
    process.exit(1)
  }
  await removeWhiteBackgroundToPNG(input, outPng, threshold)
  await rasterToSVG(outPng, outSvg)
  console.log(`PNG gerado: ${outPng}`)
  console.log(`SVG gerado: ${outSvg}`)
}

main().catch(err => {
  console.error('Falha ao preparar logo:', err)
  process.exit(1)
})
