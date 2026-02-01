/**
 * @packageDocumentation
 *
 * @remarks
 * Resume view contracts are composed from DraftResume data and Resume styles.
 * This module currently exposes only the styles contracts to keep data and view
 * concerns orthogonal while the view layer is still evolving.
 *
 * @see {@link ./styles.schema | Resume Styles schemas}
 * @see {@link ./styles.types | Resume Styles types}
 */

/**
 * @remarks Re-export Resume Styles runtime schemas for consumers.
 */
export * from "./styles.schema";

/**
 * @remarks Re-export Resume Styles compile-time types for consumers.
 */
export * from "./styles.types";
