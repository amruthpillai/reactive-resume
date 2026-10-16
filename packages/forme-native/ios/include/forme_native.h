#ifndef FORME_NATIVE_H
#define FORME_NATIVE_H

#include <stdarg.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>

typedef struct FormeBuffer {
  uint8_t *data;
  size_t len;
} FormeBuffer;

typedef struct FormeResult {
  struct FormeBuffer pdf;
  struct FormeBuffer layout;
  struct FormeBuffer warnings;
  struct FormeBuffer error;
} FormeResult;

#ifdef __cplusplus
extern "C" {
#endif // __cplusplus

/**
 * # Safety
 * Input must remain readable for the call. Free the returned result exactly once with forme_result_free.
 */
struct FormeResult *forme_render_with_layout(const uint8_t *json,
                                             size_t len);

/**
 * # Safety
 * Subset bytes are in result.pdf. Inputs must remain readable for the call; free result exactly once.
 */
struct FormeResult *forme_subset_font(const uint8_t *font,
                                      size_t font_len,
                                      const uint8_t *text,
                                      size_t text_len);

/**
 * # Safety
 * Result must come from this library and must not have been freed already. Null is allowed.
 */
void forme_result_free(struct FormeResult *result);

#ifdef __cplusplus
}  // extern "C"
#endif  // __cplusplus

#endif  /* FORME_NATIVE_H */
