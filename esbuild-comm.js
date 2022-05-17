const fs = require('fs');

let copy = function (srcDir, dstDir) {
	try {
		var stat = fs.statSync(dstDir);
		if (!stat) {
			console.log('creating dir: ' + dstDir);
			fs.mkdirSync(dstDir);
		}
	} catch (e) {
		fs.mkdirSync(dstDir);
		console.log('create directory failed: ' + dstDir);
	}
	var results = [];
	var list = fs.readdirSync(srcDir);
	var src, dst;
	list.forEach(function (file) {
		src = srcDir + '/' + file;
		dst = dstDir + '/' + file;
		//console.log(src);
		var stat = fs.statSync(src);
		if (stat && stat.isDirectory()) {
			try {
				console.log('creating dir: ' + dst);
				fs.mkdirSync(dst);
			} catch (e) {
				console.log('directory already exists: ' + dst);
			}
			results = results.concat(copy(src, dst));
		} else {
			try {
				// console.log('copying file: ' + dst);
				//fs.createReadStream(src).pipe(fs.createWriteStream(dst));
				fs.writeFileSync(dst, fs.readFileSync(src));
			} catch (e) {
				console.log('could\'t copy file: ' + dst);
			}
			results.push(src);
		}
	});
	return results;
}

// require.resolve('...') => await import.meta.resolve('...')
let reactOnResolvePlugin = {
	name: 'react2preact',
	setup(build) {
		// let path = require('path')

		// Redirect all 'react' to "./public/images/"
		build.onResolve({ filter: /^react$/ }, args => {
			return {
				path: require.resolve('preact/compat'),
				external: false,
			}
		});
		build.onResolve({ filter: /^react-dom$/ }, args => {
			return {
				path: require.resolve('preact/compat'),
				external: false,
			}
		});
	},
}

let copyPlugin = {
	name: 'copy',
	setup(build) {
		build.onStart(() => {
			const options = build.initialOptions;
			console.log('build started', options);

			copy('./public', options.outdir);
			console.log('copy static files end: ', './public', '->', options.outdir);

			copy('./node_modules/@ffmpeg/core/dist', options.outdir);
			console.log('copy static files end: ', '@ffmpeg/core', '->', options.outdir);
		})
	},
}

module.exports = {
	reactOnResolvePlugin,
	copyPlugin,
	copy,
};
