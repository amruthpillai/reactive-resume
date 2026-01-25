import { motion } from "motion/react";

type SpotlightProps = {
	duration?: number;
	gradientFirst?: string;
	gradientSecond?: string;
	gradientThird?: string;
	width?: number;
	height?: number;
	smallWidth?: number;
	translateY?: number;
	xOffset?: number;
};

export const Spotlight = ({
	duration = 7,
	gradientFirst = "radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(210, 100%, 85%, .08) 0, hsla(210, 100%, 55%, .02) 50%, hsla(210, 100%, 45%, 0) 80%)",
	gradientSecond = "radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .06) 0, hsla(210, 100%, 55%, .02) 80%, transparent 100%)",
	gradientThird = "radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .04) 0, hsla(210, 100%, 45%, .02) 80%, transparent 100%)",
	width = 560,
	height = 1380,
	smallWidth = 240,
	translateY = -350,
	xOffset = 100,
}: SpotlightProps) => {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 1.5 }}
			className="pointer-events-none absolute inset-0 h-full w-full"
		>
			<motion.div
				animate={{ x: [0, xOffset, 0] }}
				transition={{ duration, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
				className="pointer-events-none absolute start-0 top-0 z-40 h-svh w-svw"
			>
				<div
					className="absolute start-0 top-0"
					style={{
						width: `${width}px`,
						height: `${height}px`,
						background: gradientFirst,
						transform: `translateY(${translateY}px) rotate(-45deg)`,
					}}
				/>

				<div
					className="absolute start-0 top-0 origin-top-left"
					style={{
						height: `${height}px`,
						width: `${smallWidth}px`,
						background: gradientSecond,
						transform: "rotate(-45deg) translate(5%, -50%)",
					}}
				/>

				<div
					className="absolute start-0 top-0 origin-top-left"
					style={{
						height: `${height}px`,
						width: `${smallWidth}px`,
						background: gradientThird,
						transform: "rotate(-45deg) translate(-180%, -70%)",
					}}
				/>
			</motion.div>

			<motion.div
				animate={{ x: [0, -xOffset, 0] }}
				className="pointer-events-none absolute end-0 top-0 z-40 h-svh w-svw"
				transition={{
					duration,
					repeat: Infinity,
					ease: "easeInOut",
					repeatType: "reverse",
				}}
			>
				<div
					className="absolute end-0 top-0"
					style={{
						width: `${width}px`,
						height: `${height}px`,
						background: gradientFirst,
						transform: `translateY(${translateY}px) rotate(45deg)`,
					}}
				/>

				<div
					className="absolute end-0 top-0 origin-top-right"
					style={{
						height: `${height}px`,
						width: `${smallWidth}px`,
						background: gradientSecond,
						transform: "rotate(45deg) translate(-5%, -50%)",
					}}
				/>

				<div
					className="absolute end-0 top-0 origin-top-right"
					style={{
						height: `${height}px`,
						width: `${smallWidth}px`,
						background: gradientThird,
						transform: "rotate(45deg) translate(180%, -70%)",
					}}
				/>
			</motion.div>
		</motion.div>
	);
};
