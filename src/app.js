import { h, Fragment, render } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';

import 'bulma/css/bulma.css';
import './all.min.css';

// comp
import {
	BackToTop,
	useMobile,
} from './simple.jsx';


import {
	createFFmpeg,
	fetchFile,
} from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({
	corePath: './ffmpeg-core.js',
	log: true,
});

function App() {
	const isMobile = useMobile();
	console.log('[ffmpeg]', ffmpeg);

	const [videoSrc, setVideoSrc] = useState([]);
	const [progress, setProgress] = useState(0);
	const [message, setMessage] = useState('');
	const [stderr, setStderr] = useState([]);
	const [files, setFiles] = useState({});
	const [args, setArgs] = useState([
		'-i', 'v.mp4',
		'-i', 'a.aac',
		'-c:v', 'copy',
		'-c:a', 'copy',
		'output.mp4',
	]);

	// load the core
	useEffect(() => {
		(async () => {
			ffmpeg.setProgress((ev) => {
				const {
					ratio,
				} = ev;
				console.log('[progress]', ev);

				if (ratio >= 0 && ratio <= 1) {
					setProgress(ratio * 100);
				}
				if (ratio === 1) {
					setTimeout(() => { setProgress(0); }, 1000);
				}
			});
			ffmpeg.setLogger(({ type, message }) => {
				switch (type) {
				case 'fferr':
					setStderr((v) => [...v, message]);
					return;
				}
			});

			setMessage('Loading FFmpeg.wasm, may take few minutes');
			const start = Date.now();
			await ffmpeg.load();
			setMessage(`Loaded FFmpeg.wasm in ${Date.now() - start} ms`);
		})();
	}, []);

	const onFileUploaded = async (ev) => {
		console.log('[onFileUploaded]', ev);

		setMessage('Loading file, may take some times');
		const start = Date.now();
		const {
			target: { files },
		} = ev;
		const append = [];
		for (let i in files) {
			const file = files[0];
			const {
				name,
				size,
				type,
			} = file;
			ffmpeg.FS('writeFile', name, await fetchFile(file));
			append[name] = {
				name,
				size,
				type,
				fd: file,
			};
		}
		setMessage(`Loaded files in ${Date.now() - start} ms`);
		setFiles((v) => {
			return { ...v, ...append };
		});
	};
	const runFn = async (ev) => {
		setMessage('Loading FFmpeg.wasm');
		if (!ffmpeg.isLoaded()) {
			setMessage('Loading ffmpeg.wasm-core, may take few minutes');
			await ffmpeg.load();
		}

		setMessage('Start to run command');
		const start = Date.now();
		await ffmpeg.run(...args);
		setMessage(`Done in ${Date.now() - start} ms`);

		const data = ffmpeg.FS('readFile', 'output.mp4');
		setVideoSrc((v) => {
			const blob = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
			return [...v, blob];
		});
	};
	return (
		<section class="section">
			<textarea class="textarea is-link" placeholder="stderr">{stderr.join('\n')}</textarea>

			<textarea class="textarea is-info" placeholder="$ ffmpeg ...">{args.join(' ')}</textarea>
			{message &&
				<div class="notification">
					<button class="delete"></button>
					{message}
				</div>
			}

			{progress != 0 &&
				<progress class="progress is-small" value={progress} max="100">{progress}%</progress>
			}

			<section class="section">
				{/* <BackToTop topEl={topEl} /> */}
				{/* <div ref={topEl}></div> */}


				<div class="buttons">
					<button class="button is-success" onClick={runFn}>Run</button>
				</div>
				<div class="file">
					<label class="file-label">
						<input class="file-input" type="file" onChange={onFileUploaded}></input>
						<span class="file-cta">
							<span class="file-icon">
								<i class="fas fa-upload"></i>
							</span>
							<span class="file-label">
								Choose a file…
							</span>
						</span>
					</label>
				</div>

				<div class="section">
					{Object.keys(files).map((k) => {
						const v = files[k];
						return (
							<div class="tags has-addons are-large">
								<a class="tag is-delete"></a>
								<span class="tag">{v.name}</span>
								<span class="tag is-dark">{v.size}</span>
							</div>
						);
					})}
				</div>

				<div class="section">
					{videoSrc.map((v, i) => {
						return (
							<div class="box">
								<video src={v} controls></video>
							</div>
						);
					})}
				</div>
			</section>

		</section>
	);
}

render(h(App), document.getElementById('app'));
