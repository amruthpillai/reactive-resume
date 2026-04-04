type KeyedField<TKey extends string> = {
  key: TKey;
};

type KeyValueMap<TKey extends string> = Partial<Record<TKey, string | null | undefined>>;

/**
 * Filters keyed field descriptors to only those whose corresponding value in the given
 * values object is a non-empty string.
 *
 * This is useful for rendering or processing only the fields with actual, non-blank content,
 * e.g., when displaying optional sections in a UI or assembling objects with present values.
 *
 * @param values - An object mapping keys to string values (which may be empty, null, or undefined)
 * @param fields - Field descriptors with { key: TKey }
 * @returns An array of fields whose corresponding values[key] is a non-empty string
 */
export function filterFieldValues<TKey extends string, TField extends KeyedField<TKey>>(
  values: KeyValueMap<TKey>,
  ...fields: TField[]
) {
  return fields.filter((field) => Boolean(values[field.key]?.trim()));
}
