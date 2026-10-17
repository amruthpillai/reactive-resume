import type { AtsReport } from "@reactive-resume/resume/ats";
import { useLingui } from "@lingui/react/macro";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Card, Text, useTheme } from "@/ui";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
type ScoreProps = { report: AtsReport };
export function Score({ report }: ScoreProps) {
	const { t } = useLingui();
	const { colors, space, motion } = useTheme();
	const [progress] = useState(() => new Animated.Value(report.score));
	const [reduced, setReduced] = useState(true);
	useEffect(() => {
		void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
		const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
		return () => listener.remove();
	}, []);
	useEffect(() => {
		const animation = Animated.timing(progress, {
			toValue: report.score,
			duration: reduced ? 0 : motion.d3,
			easing: motion.ease,
			useNativeDriver: false,
		});
		animation.start();
		return () => animation.stop();
	}, [progress, report.score, reduced, motion]);
	const diameter = space.s12 + space.s10;
	const ringRadius = (diameter - space.s2) / 2;
	const circumference = 2 * Math.PI * ringRadius;
	return (
		<Card style={{ flexDirection: "row", alignItems: "center", gap: space.s4 }}>
			<View
				accessibilityRole="progressbar"
				accessibilityLabel={t`Readability score`}
				accessibilityValue={{ min: 0, max: 100, now: report.score }}
				style={{ width: diameter, height: diameter, justifyContent: "center", alignItems: "center" }}
			>
				<Svg width={diameter} height={diameter} style={{ position: "absolute" }} accessible={false}>
					<Circle
						cx={diameter / 2}
						cy={diameter / 2}
						r={ringRadius}
						stroke={colors.line}
						strokeWidth={space.s1}
						fill="none"
					/>
					<AnimatedCircle
						cx={diameter / 2}
						cy={diameter / 2}
						r={ringRadius}
						stroke={report.score >= 80 ? colors.accent : colors.warn}
						strokeWidth={space.s1}
						fill="none"
						strokeDasharray={`${circumference} ${circumference}`}
						strokeDashoffset={progress.interpolate({ inputRange: [0, 100], outputRange: [circumference, 0] })}
						rotation={-90}
						origin={`${diameter / 2}, ${diameter / 2}`}
					/>
				</Svg>
				<Text variant="display">{report.score}</Text>
			</View>
			<View style={{ flex: 1, gap: space.s1 }}>
				<Text variant="title">
					{report.score >= 80
						? t`Reads cleanly`
						: report.score >= 50
							? t`Mostly readable`
							: t`Hard for software to read`}
				</Text>
				<Text
					variant="callout"
					color="ink2"
				>{t`${report.passedRules} of ${report.totalRules} checks pass. ${report.findings.length} things to review.`}</Text>
				<Text variant="caption" color="ink3">{t`Live · updates as you edit`}</Text>
			</View>
		</Card>
	);
}
