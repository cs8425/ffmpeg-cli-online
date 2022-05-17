import { h, Fragment, isValidElement, createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';

function BackToTop(props) {
	const { topEl } = props;
	const [show, setShow] = useState(false);
	useEffect(() => {
		const ckFn = (e) => {
			if (!topEl.current) return null;
			const { top } = topEl.current.getBoundingClientRect();
			setShow(top < 0);
		};
		window.addEventListener('scroll', ckFn);
		return () => {
			window.removeEventListener('scroll', ckFn);
		};
	}, []);
	const goTop = (e) => {
		topEl?.current.scrollIntoView();
	};
	if (!show) return null;
	return (
		<button onClick={goTop} class="button is-large" style="position: fixed;right: 1rem;bottom: 1rem;z-index: 128;">
			<span class="icon">
				<i class="fas fa-angle-up fa-lg"></i>
			</span>
		</button>
	);
}
export { BackToTop };

const checkMobile = (breakPoint = 768) => {
	const width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
	return width < breakPoint;
}

function useMobile(breakPoint = 768) {
	const [isMobile, setIsMobile] = useState(checkMobile(breakPoint));
	useEffect(() => {
		const ckFn = (ev) => {
			setIsMobile(checkMobile(breakPoint));
		};
		window.addEventListener('resize', ckFn, true);
		return () => {
			window.removeEventListener(ckFn);
		};
	}, []);
	return isMobile;
}
export { useMobile };
