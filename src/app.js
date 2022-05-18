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

	const [loading, setLoading] = useState(true);
	const [progress, setProgress] = useState(0);
	const [message, setMessage] = useState('');
	const [stderr, setStderr] = useState([]);

	const [files, setFiles] = useState({});
	const [outFile, setOutFile] = useState('output.mp4');
	const [args, setArgs] = useState([
		'-i', 'v.mp4',
		'-i', 'a.aac',
		'-c:v', 'copy',
		'-c:a', 'copy',
	]);
	const [videoSrc, setVideoSrc] = useState([]); // output files

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
			setLoading(false);
		})();
	}, []);

	const onFileUploaded = async (ev) => {
		console.log('[onFileUploaded]', ev);

		setMessage('Loading file, may take some times...');
		const start = Date.now();
		const {
			target: { files },
		} = ev;
		const append = [];
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
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
		const out = outFile;
		await ffmpeg.run(...[...args, out]);
		setMessage(`Done in ${Date.now() - start} ms`);

		const data = ffmpeg.FS('readFile', out);
		setVideoSrc((v) => {
			const blob = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' })); // TODO: by extension name
			ffmpeg.FS('unlink', out);
			return [...v, {
				f: out,
				blob,
			}];
		});
	};
	const newArgEl = useRef(null);
	return (
		<section class="section">
			<h1 class="title">FFmpeg cli online</h1>
			<p class="subtitle">client-side-only FFmpeg power by <a href="https://ffmpegwasm.netlify.app/" target="_blank" rel="noopener">ffmpeg.wasm</a></p>
			<a
				class="button is-large is-rounded is-dark"
				style="position: absolute;right: 1rem;top: 1rem;"
				title="GitHub repo"
				href="https://github.com/cs8425/ffmpeg-cli-online"
				target="_blank"
			>
				<span class="icon is-medium">
					<i class="fab fa-github"></i>
				</span>
			</a>
			<hr />

			{/* <BackToTop topEl={topEl} /> */}
			{/* <div ref={topEl}></div> */}

			<div class="block">
				<MsgBlock header="ffmpeg command">
					<textarea class="textarea is-info" placeholder="$ ffmpeg ..." readOnly rows={2}>ffmpeg {args.join(' ')} {outFile}</textarea>
				</MsgBlock>

				<MsgBlock header="args:">
					<div class="field is-grouped is-grouped-multiline">

						{args.map((v, i) => {
							const onDel = () => {
								setArgs((v) => v.filter((_, idx) => idx !== i));
							};
							return (
								<Args argv={args} idx={i} onDel={onDel}></Args>
							);
						})}

						<div class="field has-addons mx-4">
							<div class="control">
								<input ref={newArgEl} class="input is-info" type="text" placeholder="args"></input>
							</div>
							<div class="control">
								<a class="button is-info" onClick={() => {
									if (!newArgEl.current) return;
									const val = newArgEl.current.value;
									if (val === '') return;
									newArgEl.current.value = '';
									setArgs((v) => {
										return [...v, val];
									});
								}}><span class="">Add</span></a>
							</div>
						</div>

						<div class="field has-addons mx-4" title="output filename">
							<div class="control">
								<a class="button is-primary is-outlined is-static">output</a>
							</div>
							<div class="control">
								<input class="input is-primary" type="text" placeholder="output.mp4" value={outFile} onBlur={(e) => { setOutFile(e.target.value); }}></input>
							</div>
						</div>
					</div>
				</MsgBlock>
			</div>


			<div class="block">
				<nav class="panel">
					<p class="panel-heading">Files</p>
					{!loading &&
						<div class="panel-tabs py-4">
							<div class="field is-grouped is-grouped-centered is-expanded">
								<p class="control">
									<div class="file">
										<label class="file-label">
											<input class="file-input" type="file" onChange={onFileUploaded} multiple></input>
											<span class="file-cta">
												<span class="file-icon">
													<i class="fas fa-upload"></i>
												</span>
												<span class="file-label">
													Choose files...
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
					}
					{loading &&
						<div class="panel-block notification">Loading ffmpeg...</div>
					}


					{Object.keys(files).map((k) => {
						const v = files[k];
						return (<FileInfo {...v}></FileInfo>);
					})}

					{Object.keys(files).length > 0 &&
						<div class="panel-block">
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


			<MsgBlock header="stderr">
				<textarea class="textarea is-link" placeholder="stderr" readonly>{stderr.join('\n')}</textarea>
			</MsgBlock>


			{progress != 0 &&
				<progress class="progress is-small" value={progress} max="100">{progress}%</progress>
			}

			<div class="block">
				<div class="columns is-flex-wrap-wrap">
					{videoSrc.map((v, i) => {
						const closeFn = (ev) => {
							URL.revokeObjectURL(v.blob);
							setVideoSrc((urls) => urls.filter((info) => info.blob !== v.blob));
						}
						return (
							<div key={v} class="column is-half-tablet is-one-third-desktop is-one-quarter-widescreen">
								<div class="card">
									<header class="card-header">
										<p class="card-header-title">{v.f}</p>
										<div class="card-header-icon"><button class="delete" onClick={closeFn}></button></div>
									</header>
									<div class="card-content">
										<video src={v.blob} controls></video>
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

function Args(props) {
	const {
		argv,
		idx,
		onDel = () => { },
	} = props;
	const updateFn = (e) => {
		argv[idx] = e.target.value;
	};
	return (
		<div class="field has-addons mx-4">
			<div class="control">
				<a class="button is-danger" onClick={onDel}><span class="delete"></span></a>
			</div>
			<div class="control">
				<input class="input" type="text" placeholder="args" value={argv[idx]} onInput={updateFn}></input>
			</div>
		</div>
	);
}

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

function MsgBlock(props) {
	const {
		header,
		children,
		isExpand = true,
	} = props;
	const [expand, setExpand] = useState(isExpand);
	return (
		<section class="message">
			<div class="message-header">
				<p>{header}</p>
				<span class="icon is-clickable" onClick={(e) => setExpand((v) => !v)}>
					<i class={`fas fa-angle-${(expand) ? 'up' : 'down'}`} aria-hidden="true"></i>
				</span>
			</div>
			{expand &&
				<div class="message-body">{children}</div>
			}
		</section>
	);
}
