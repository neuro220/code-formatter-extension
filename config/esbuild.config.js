const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// Build configuration for Chrome/Firefox extension
const commonConfig = {
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: true,
  sourcemap: false,
  treeShaking: true,
  splitting: false,
  platform: 'browser',
  external: ['chrome'],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  minifyWhitespace: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  legalComments: 'none',
};

/**
 * Copy WASM files and JS wrappers from node_modules to output directory
 */
function copyWasmFiles() {
  const wasmPackages = [
    {
      name: '@wasm-fmt/ruff_fmt',
      files: ['ruff_fmt_web.js', 'ruff_fmt_bg.js', 'ruff_fmt_bg.wasm'],
    },
    {
      name: '@wasm-fmt/gofmt',
      files: ['gofmt_web.js', 'gofmt.js', 'gofmt.wasm', 'gofmt_binding.js'],
    },
    {
      name: '@wasm-fmt/sql_fmt',
      files: ['sql_fmt_web.js', 'sql_fmt_bg.js', 'sql_fmt_bg.wasm'],
    },
    {
      name: '@wasm-fmt/yamlfmt',
      files: ['yamlfmt_web.js', 'yamlfmt_bg.js', 'yamlfmt_bg.wasm'],
    },
    {
      name: '@wasm-fmt/taplo_fmt',
      files: ['taplo_fmt_web.js', 'taplo_fmt_bg.js', 'taplo_fmt_bg.wasm'],
    },
  ];

  const wasmDir = path.join(__dirname, '..', 'wasm');

  if (!fs.existsSync(wasmDir)) {
    fs.mkdirSync(wasmDir, { recursive: true });
  }

  wasmPackages.forEach(pkg => {
    const pkgPath = path.join(rootDir, 'node_modules', pkg.name);
    if (fs.existsSync(pkgPath)) {
      pkg.files.forEach(file => {
        const src = path.join(pkgPath, file);
        const dest = path.join(wasmDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          console.log(`  📋 Copied ${pkg.name}/${file}`);
        } else {
          console.warn(`  ⚠️  Missing ${pkg.name}/${file}`);
        }
      });
    }
  });
}

/**
 * Copy HTML files from assets to root
 */
function copyHtmlFiles() {
  const htmlFiles = ['options.html', 'changelog.html'];
  const assetsDir = path.join(__dirname, '..', 'assets');

  htmlFiles.forEach(file => {
    const src = path.join(assetsDir, file);
    const dest = path.join(__dirname, '..', file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`  📋 Copied ${file}`);
    }
  });
}

async function build() {
  try {
    console.log('🏗️  Building extension...\n');

    // Build background script
    console.log('📦 Building background script...');
    await esbuild.build({
      ...commonConfig,
      entryPoints: [path.join(rootDir, 'src/background.ts')],
      outfile: path.join(rootDir, 'background.min.js'),
      footer: { js: '// Background script built successfully' },
    });
    console.log('✅ Background script built\n');

    // Build content script with CodeMirror
    console.log('📦 Building content script (with CodeMirror)...');
    await esbuild.build({
      ...commonConfig,
      entryPoints: [path.join(rootDir, 'src/content.ts')],
      outfile: path.join(rootDir, 'content.min.js'),
      footer: { js: '// Content script built successfully' },
    });
    console.log('✅ Content script built\n');

    // Build options page script
    console.log('📦 Building options page script...');
    await esbuild.build({
      ...commonConfig,
      entryPoints: [path.join(rootDir, 'src/options.ts')],
      outfile: path.join(rootDir, 'options.js'),
    });
    console.log('✅ Options script built\n');

    // Build changelog script
    console.log('📦 Building changelog script...');
    await esbuild.build({
      ...commonConfig,
      entryPoints: [path.join(rootDir, 'src/changelog.ts')],
      outfile: path.join(rootDir, 'changelog.js'),
    });
    console.log('✅ Changelog script built\n');

    // Copy WASM files
    console.log('📦 Copying WASM files...');
    copyWasmFiles();
    console.log('✅ WASM files copied\n');

    // Copy HTML files
    console.log('📦 Copying HTML files...');
    copyHtmlFiles();
    console.log('✅ HTML files copied\n');

    console.log('🎉 Build completed successfully!');
    console.log('\n📁 Output files:');
    console.log('  - background.min.js');
    console.log('  - content.min.js');
    console.log('  - options.js');
    console.log('  - changelog.js');
    console.log('  - wasm/ (WASM binaries and JS wrappers)');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Watch mode for development
if (process.argv.includes('--watch')) {
  console.log('👀 Watch mode enabled...\n');

  const ctx = esbuild.context({
    ...commonConfig,
    entryPoints: [
      path.join(rootDir, 'src/background.ts'),
      path.join(rootDir, 'src/content.ts'),
      path.join(rootDir, 'src/options.ts'),
      path.join(rootDir, 'src/changelog.ts'),
    ],
    outdir: rootDir,
  });

  ctx.then(context => {
    context.watch();
    console.log('👀 Watching for changes...');
  });
} else {
  build();
}
