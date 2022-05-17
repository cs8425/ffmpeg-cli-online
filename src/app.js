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
			ffmpeg.FS('unlink', 'output.mp4');
			return [...v, blob];
		});
	};
	return (
		<section class="section">
			{/* <BackToTop topEl={topEl} /> */}
			{/* <div ref={topEl}></div> */}

			<div class="block">
				<textarea class="textarea is-info" placeholder="$ ffmpeg ...">{args.join(' ')}</textarea>
			</div>

			<div class="block">
				<nav class="panel">
					<p class="panel-heading">Files</p>
					<div class="panel-tabs py-4">
						<div class="field is-grouped is-grouped-centered is-expanded">
							<p class="control">
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
							</p>
							<p class="control">
								<div class="buttons">
									{/* <button class="button is-success" onClick={runFn}>Run</button> */}
									{/* <button class="button is-danger is-fullwidth">delete</button> */}
								</div>
							</p>
						</div>
					</div>

					{Object.keys(files).map((k) => {
						const v = files[k];
						return (<FileInfo {...v}></FileInfo>);
					})}

					{Object.keys(files).length > 0 &&
						<div class="panel-block">
							{/* <button class="button is-danger is-outlined is-fullwidth">delete</button> */}
							<button class="button is-success is-outlined is-fullwidth mr-3" onClick={runFn}>run</button>
							<button class="button is-danger is-outlined ml-3">delete</button>
						</div>
					}
				</nav>
			</div>

			{message &&
				<div class="notification">
					<button class="delete"></button>
					{message}
				</div>
			}

			<div class="block">
				<textarea class="textarea is-link" placeholder="stderr">{stderr.join('\n')}</textarea>
			</div>


			{progress != 0 &&
				<progress class="progress is-small" value={progress} max="100">{progress}%</progress>
			}

			<div class="block">
				<div class="columns is-flex-wrap-wrap">
					{videoSrc.map((v, i) => {
						const closeFn = (ev) => {
							URL.revokeObjectURL(v);
							setVideoSrc((urls) => urls.filter((url) => url !== v));
						}
						return (
							<div key={v} class="column is-half-tablet is-one-third-desktop is-one-quarter-widescreen">
								<div class="card">
									<header class="card-header">
										<p class="card-header-title">{'output.mp4'}</p>
										<div class="card-header-icon"><button class="delete" onClick={closeFn}></button></div>
									</header>
									<div class="card-content">
										<video src={v} controls></video>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

		</section>
	);
}

render(h(App), document.getElementById('app'));

function FileInfo(props) {
	const {
		name,
		size,
		type,
		fd,
	} = props;
	return (
		<label class="panel-block is-justify-content-space-between">
			<div class="level-left">
				<div class="level-item">
					<input type="checkbox"></input>
				</div>
				<div class="level-item">{name}</div>
			</div>
			<div class="level-right">
				<p class="level-item">{printSize(size)}</p>
				{/* <p class="level-item"><button class="delete is-medium"></button></p> */}
			</div>
		</label>
	);
}

function printSize(v) {
	let unit = 'Bytes';
	if (v > 1024) {
		v /= 1024;
		unit = 'KB';
	}
	if (v > 1024) {
		v /= 1024;
		unit = 'MB';
	}
	if (v > 1024) {
		v /= 1024;
		unit = 'GB';
	}
	return `${v.toFixed(2)} ${unit}`;
}
