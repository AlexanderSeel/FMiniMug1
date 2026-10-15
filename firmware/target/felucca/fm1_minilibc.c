/* SPDX-License-Identifier: GPL-3.0-only
 * Minimal freestanding routines required by the FMiniMug1 JieLi target.
 * No formatted I/O, allocation, locale, or host libc dependency.
 */
#include <stddef.h>

void *memset(void *dst, int value, size_t size) {
  unsigned char *p = (unsigned char *)dst;
  while (size--) *p++ = (unsigned char)value;
  return dst;
}

void *memcpy(void *dst, const void *src, size_t size) {
  unsigned char *d = (unsigned char *)dst;
  const unsigned char *s = (const unsigned char *)src;
  while (size--) *d++ = *s++;
  return dst;
}

int memcmp(const void *a, const void *b, size_t size) {
  const unsigned char *p = (const unsigned char *)a;
  const unsigned char *q = (const unsigned char *)b;
  while (size--) {
    if (*p != *q) return (int)*p - (int)*q;
    ++p;
    ++q;
  }
  return 0;
}
