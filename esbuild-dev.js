const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const esbuild = require('esbuild');
const hanlder = require('serve-handler');
const comm = require('./esbuild-comm.js');

const config = {
	devPort: 8000,
	skipGz: true,
};

const ostemp = (os.type() === 'Linux') ? '/dev/shm' : os.tmpdir();
const tmpdir = fs.mkdtempSync(path.join(ostemp, 'esbuild-')) || './dev-tmp/dist';
const cleanFn = () => {
	console.log('[clean]', tmpdir);
	fs.rmSync(tmpdir, { recursive: true, force: true });
	process.exit();
};
process.on('exit', cleanFn);
process.on('SIGINT', cleanFn); //catches ctrl+c event


// const fileHanlder = new statik.Server('./dist');
const fileHanlder = (req, res) => hanlder(req, res, {
	"public": tmpdir,
	"etag": true
});
esbuild.build({
	define: { 'process.env.NODE_ENV': '"development"' }, // production
	entryPoints: ['src/app.js'],
	bundle: true,
	// minify: true,
	// pure: ['console.log'],
	sourcemap: true,
	sourcesContent: true,
	target: [
		// 'es2015',
		'es2020',
	],
	outdir: tmpdir,
	loader: {
		'.js': 'jsx',
		'.png': 'file',
		'.jpg': 'file',
		'.gif': 'file',
		'.svg': 'file',
		'.woff': 'file',
		'.woff2': 'file',
		'.ttf': 'file',
		'.eot': 'file',
		'.wasm': 'file',
	},
	jsxFactory: 'h',
	jsxFragment: 'Fragment',
	plugins: [
		comm.reactOnResolvePlugin,
		comm.copyPlugin,
	],
	watch: {
		onRebuild(error, result) {
			if (error) {
				console.error('watch build failed:', error);
			} else {
				console.log('watch build succeeded:', result);
			}
		},
	},
}).then((result) => {
	console.log('build OK:', result);

	// Then start a http server on port config.devPort
	http.createServer((req, res) => {
		console.log('[req]', req.url, req.headers);

		if (config.skipGz) delete req.headers['accept-encoding']; // skip gz

		// ffmpeg-wasm
		res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
		res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

		// Serve files!
		req.addListener('end', function () {
			// fileHanlder.serve(req, res);
			fileHanlder(req, res);
		}).resume();
		// fileHanlder(req, res);

	}).listen(config.devPort);
});

