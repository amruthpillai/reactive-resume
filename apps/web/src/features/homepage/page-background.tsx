import { m, useReducedMotion, useScroll, useTransform } from "motion/react";

export function PageBackground() {
	const reducedMotion = useReducedMotion();
	return reducedMotion ? null : <ParallaxPlanes />;
}

const planeClass =
	"absolute aspect-[210/297] origin-[50%_75%] rounded-[3px] border before:absolute before:inset-[7px_-8px_-8px_7px] before:rounded-[inherit] before:border before:border-current before:content-[''] after:absolute after:top-[14%] after:left-[13%] after:h-[15%] after:w-[30%] after:border-y after:border-current after:content-['']";

function ParallaxPlanes() {
	const { scrollYProgress } = useScroll();
	const far = useTransform(
		scrollYProgress,
		[0, 1],
		["translate3d(0, 4vh, 0) rotate(-19deg)", "translate3d(0, -9vh, 0) rotate(-13deg)"],
	);
	const middle = useTransform(
		scrollYProgress,
		[0, 1],
		["translate3d(0, 15vh, 0) rotate(24deg)", "translate3d(0, -25vh, 0) rotate(15deg)"],
	);
	const near = useTransform(
		scrollYProgress,
		[0, 1],
		["translate3d(0, 27vh, 0) rotate(-27deg)", "translate3d(0, -48vh, 0) rotate(-15deg)"],
	);

	return (
		<div
			className="pointer-events-none fixed inset-0 z-0 select-none overflow-clip contain-paint motion-reduce:hidden"
			aria-hidden="true"
		>
			<m.div
				className={`${planeClass} top-[3%] left-[31%] w-[clamp(150px,18vw,270px)] border-[rgb(241_240_235/4%)] bg-transparent text-[rgb(241_240_235/4%)] max-[600px]:left-[47%]`}
				style={{ transform: far }}
			/>
			<m.div
				className={`${planeClass} top-[22%] -right-[7%] w-[clamp(250px,29vw,440px)] border-[rgb(241_240_235/7%)] border-r-[rgb(131_154_137/19%)] bg-[rgb(111_139_117/1.3%)] text-[rgb(131_154_137/10%)] max-[600px]:-right-[43%]`}
				style={{ transform: middle }}
			/>
			<m.div
				className={`${planeClass} top-[49%] -left-[10%] w-[clamp(310px,34vw,540px)] border-[rgb(241_240_235/7%)] border-l-[rgb(166_143_184/20%)] bg-[rgb(152_125_174/1.4%)] text-[rgb(166_143_184/9%)] max-[600px]:-left-[58%]`}
				style={{ transform: near }}
			/>
		</div>
	);
}
