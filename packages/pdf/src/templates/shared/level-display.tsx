import type { Style } from "@react-pdf/types";
import type { IconName } from "phosphor-icons-react-pdf/dynamic";
import { useRender } from "../../context";
import { View } from "../../renderer";
import { useSectionStyleRule, useTemplateIconSlot, useTemplateStyle } from "./context";
import { resolveStyleFontSize } from "./icon-size";
import { getTemplateMetrics } from "./metrics";
import { Icon } from "./primitives";
import { composeStyles } from "./styles";

const LEVEL_ITEM_KEYS = ["level-1", "level-2", "level-3", "level-4", "level-5"] as const;

type LevelDisplayProps = {
	level: number;
};

export const LevelDisplay = ({ level }: LevelDisplayProps) => {
	const data = useRender();
	const levelDesign = data.metadata.design.level;
	const metrics = getTemplateMetrics(data.metadata.page);
	const iconProps = useTemplateIconSlot("icon");
	const levelContainerStyle = useTemplateStyle("levelContainer");
	const levelItemStyle = useTemplateStyle("levelItem");
	const levelItemActiveStyle = useTemplateStyle("levelItemActive");
	const levelItemInactiveStyle = useTemplateStyle("levelItemInactive");
	const levelRuleStyle = useSectionStyleRule("level");
	const levelFontSize = resolveStyleFontSize(levelRuleStyle);
	const defaultIconSize = data.metadata.typography.body.fontSize - 2;
	const iconSize = levelFontSize ?? defaultIconSize;
	const levelIconSize = levelFontSize ?? iconSize + 4;
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
				levelRuleStyle,
			)}
		>
			{LEVEL_ITEM_KEYS.map((itemKey, index) => {
				const isActive = index < level;

				if (levelDesign.type === "icon") {
					return (
						<Icon
							key={itemKey}
							size={levelIconSize}
							name={levelDesign.icon as IconName}
							style={{ opacity: isActive ? 1 : 0.35 }}
						/>
					);
				}

				if (levelDesign.type === "progress-bar") {
					return (
						<View
							key={itemKey}
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
						key={itemKey}
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
