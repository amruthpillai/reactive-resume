import type { Style } from "@react-pdf/types";
import type { IconName } from "phosphor-icons-react-pdf/dynamic";
import { View } from "@react-pdf/renderer";
import { useRender } from "../../context";
import { useTemplateIconSlot, useTemplateStyle } from "./context";
import { getTemplateMetrics } from "./metrics";
import { Icon } from "./primitives";
import { composeStyles } from "./styles";

export const LevelDisplay = ({ level }: { level: number }) => {
	const data = useRender();
	const levelDesign = data.metadata.design.level;
	const iconSize = data.metadata.typography.body.fontSize - 4;
	const metrics = getTemplateMetrics(data.metadata.page);
	const iconProps = useTemplateIconSlot("icon");
	const levelContainerStyle = useTemplateStyle("levelContainer");
	const levelItemStyle = useTemplateStyle("levelItem");
	const levelItemActiveStyle = useTemplateStyle("levelItemActive");
	const levelItemInactiveStyle = useTemplateStyle("levelItemInactive");
	const color = typeof iconProps.color === "string" ? iconProps.color : "#000000";

	if (level === 0) return null;
	if (levelDesign.type === "hidden") return null;
	if (levelDesign.type === "icon" && levelDesign.icon === "") return null;

	let gap = metrics.gapX(1 / 3);

	if (levelDesign.type === "progress-bar") {
		gap = 0;
	}

	if (levelDesign.type === "rectangle-full") {
		gap = metrics.gapX(0.5);
	}

	return (
		<View
			style={composeStyles(
				{ flexDirection: "row", alignItems: "center", marginTop: 2, columnGap: gap },
				levelContainerStyle,
			)}
		>
			{Array.from({ length: 5 }).map((_, index) => {
				const isActive = index < level;

				if (levelDesign.type === "icon") {
					return (
						<Icon
							key={index}
							size={iconSize + 4}
							name={levelDesign.icon as IconName}
							style={{ opacity: isActive ? 1 : 0.35 }}
						/>
					);
				}

				if (levelDesign.type === "progress-bar") {
					return (
						<View
							key={index}
							style={composeStyles(
								{
									flex: 1,
									height: iconSize,
									borderWidth: 0.75,
									borderColor: color,
									backgroundColor: isActive ? color : "transparent",
								},
								levelItemStyle,
								isActive ? levelItemActiveStyle : levelItemInactiveStyle,
							)}
						/>
					);
				}

				const itemStyle: Style = {};
				let borderRadius = 0;
				let width: string | number = iconSize;

				if (levelDesign.type === "rectangle") {
					width = 16;
				}

				if (levelDesign.type === "rectangle-full") {
					width = "auto";
					itemStyle.flex = 1;
				}

				if (levelDesign.type === "circle") {
					borderRadius = 999;
				}

				return (
					<View
						key={index}
						style={composeStyles(
							{
								width,
								height: iconSize,
								borderWidth: 0.75,
								borderColor: color,
								borderRadius,
								backgroundColor: isActive ? color : "transparent",
								...itemStyle,
							},
							levelItemStyle,
							isActive ? levelItemActiveStyle : levelItemInactiveStyle,
						)}
					/>
				);
			})}
		</View>
	);
};
