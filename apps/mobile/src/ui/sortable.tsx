import type { ReactElement } from "react";
import type { AccessibilityActionEvent, AccessibilityActionInfo } from "react-native";
import { useLingui } from "@lingui/react/macro";
import { View } from "react-native";
import { useSharedValue, withTiming } from "react-native-reanimated";
import ReorderableList, { reorderItems, useIsActive, useReorderableDrag } from "react-native-reorderable-list";
import { haptics, useReducedMotion } from "./motion";
import { useTheme } from "./theme";

export type SortableItemInfo<T> = {
	item: T;
	index: number;
	/** Starts dragging this item; call it from a handle's `onLongPress` or `onPressIn`. */
	drag: () => void;
	/** This item is being dragged. */
	isActive: boolean;
	/**
	 * Move up / Move down for screen readers. Spread both onto the row's accessible element; dragging is not
	 * available to them.
	 */
	accessibilityActions?: AccessibilityActionInfo[] | undefined;
	onAccessibilityAction?: ((event: AccessibilityActionEvent) => void) | undefined;
};

export type SortableListProps<T> = {
	data: T[];
	keyExtractor: (item: T) => string;
	renderItem: (info: SortableItemInfo<T>) => ReactElement;
	/** Receives the list in its new order after a drop. */
	onReorder: (data: T[], move: { from: number; to: number }) => void;
	ListHeaderComponent?: ReactElement | undefined;
	ListFooterComponent?: ReactElement | undefined;
};

type CellProps<T> = {
	item: T;
	index: number;
	count: number;
	renderItem: SortableListProps<T>["renderItem"];
	move: (from: number, to: number) => void;
};

function Cell<T>({ item, index, count, renderItem, move }: CellProps<T>) {
	const { t } = useLingui();
	const { colors, radius, shadows } = useTheme();
	const drag = useReorderableDrag();
	const isActive = useIsActive();
	const actions = [
		...(index > 0 ? [{ name: "moveUp", label: t`Move up` }] : []),
		...(index < count - 1 ? [{ name: "moveDown", label: t`Move down` }] : []),
	];

	return (
		// The lifted row floats on `e2` (mockups: "Lifted row scales to 1.02 with shadow-2").
		<View
			style={
				isActive
					? { borderRadius: radius.rLg, backgroundColor: colors.raised, boxShadow: shadows.e2.boxShadow }
					: undefined
			}
		>
			{renderItem({
				item,
				index,
				isActive,
				drag: () => {
					haptics.selection();
					drag();
				},
				accessibilityActions: actions,
				onAccessibilityAction: ({ nativeEvent }) => {
					if (nativeEvent.actionName === "moveUp") move(index, index - 1);
					if (nativeEvent.actionName === "moveDown") move(index, index + 1);
				},
			})}
		</View>
	);
}

/**
 * A vertical list whose items reorder by drag (react-native-reorderable-list on Reanimated). The lifted row scales
 * to 1.02 over `d1`; the others slide over `d2`. Reduced motion: no scale, rows jump.
 */
export function SortableList<T>({ data, keyExtractor, renderItem, onReorder, ...props }: SortableListProps<T>) {
	const { motion } = useTheme();
	const reduced = useReducedMotion();
	const scale = useSharedValue(1);
	const lifted = reduced ? 1 : 1.02;
	const move = (from: number, to: number) => onReorder(reorderItems(data, from, to), { from, to });

	return (
		<ReorderableList
			data={data}
			keyExtractor={keyExtractor}
			renderItem={({ item, index }) => (
				<Cell item={item} index={index} count={data.length} renderItem={renderItem} move={move} />
			)}
			onReorder={({ from, to }) => move(from, to)}
			shouldUpdateActiveItem
			animationDuration={reduced ? 0 : motion.d2}
			cellAnimations={{ opacity: 1, transform: [{ scale }] }}
			onDragStart={() => {
				"worklet";
				scale.set(withTiming(lifted, { duration: motion.d1 }));
			}}
			onDragEnd={() => {
				"worklet";
				scale.set(withTiming(1, { duration: motion.d2 }));
			}}
			{...props}
		/>
	);
}
