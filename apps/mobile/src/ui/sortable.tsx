import type { ReactElement } from "react";
import ReorderableList, { reorderItems, useIsActive, useReorderableDrag } from "react-native-reorderable-list";

export type SortableItemInfo<T> = {
	item: T;
	index: number;
	/** Starts dragging this item; call it from a handle's `onLongPress` or `onPressIn`. */
	drag: () => void;
	/** This item is being dragged. */
	isActive: boolean;
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
	renderItem: SortableListProps<T>["renderItem"];
};

function Cell<T>({ item, index, renderItem }: CellProps<T>) {
	const drag = useReorderableDrag();
	const isActive = useIsActive();
	return renderItem({ item, index, drag, isActive });
}

/** A vertical list whose items reorder by drag (react-native-reorderable-list on Reanimated). */
export function SortableList<T>({ data, keyExtractor, renderItem, onReorder, ...props }: SortableListProps<T>) {
	return (
		<ReorderableList
			data={data}
			keyExtractor={keyExtractor}
			renderItem={({ item, index }) => <Cell item={item} index={index} renderItem={renderItem} />}
			onReorder={({ from, to }) => onReorder(reorderItems(data, from, to), { from, to })}
			{...props}
		/>
	);
}
