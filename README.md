# FFmpeg cli online
client-side-only FFmpeg, power by [ffmpeg.wasm](https://ffmpegwasm.netlify.app/)


### demo
host by github pages + cloudflare: [https://sauceburnseal.net/ffmpeg/](https://sauceburnseal.net/ffmpeg/)


### build

1. install dependencies: `npm install`
2. build: `npm run build`
3. if nothing goes wrong, you can find output files in `dist/`.


### host

You must add two HTTP headers (`Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin`),
in order to get rid of error `Uncaught (in promise) ReferenceError: SharedArrayBuffer is not defined`.
see [https://github.com/ffmpegwasm/ffmpeg.wasm#installation](https://github.com/ffmpegwasm/ffmpeg.wasm#installation)


### dev

1. install dependencies: `npm install`
2. build: `npm run start`
3. navigate to [http://127.0.0.1:8000](http://127.0.0.1:8000) in browser
