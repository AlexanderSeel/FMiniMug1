/* SPDX-License-Identifier: GPL-3.0-only
 * Minimal freestanding routines required by the FMiniMug1 JieLi target.
 * No formatted I/O, allocation, locale, or host libc dependency.
 */
#include <stddef.h>
#include <stdint.h>

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

typedef union {
  float f;
  uint32_t u;
} fmm_float_bits_t;

/* pi32v2's freestanding linker does not automatically add compiler-rt. These
 * helpers implement the small subset Clang emits for C float/int casts. */
int __fixsfsi(float value) {
  fmm_float_bits_t bits;
  bits.f = value;
  const uint32_t sign = bits.u >> 31;
  const uint32_t raw_exp = (bits.u >> 23) & 0xFFu;
  if (raw_exp == 0u) return 0;
  if (raw_exp == 0xFFu) return sign ? (int)0x80000000u : 0x7FFFFFFF;
  const int exp = (int)raw_exp - 127;
  if (exp < 0) return 0;
  if (exp > 30) return sign ? (int)0x80000000u : 0x7FFFFFFF;
  uint32_t mantissa = (bits.u & 0x7FFFFFu) | 0x800000u;
  uint32_t magnitude = exp >= 23 ? mantissa << (unsigned)(exp - 23) : mantissa >> (unsigned)(23 - exp);
  return sign ? -(int)magnitude : (int)magnitude;
}

unsigned __fixunssfsi(float value) {
  fmm_float_bits_t bits;
  bits.f = value;
  if (bits.u >> 31) return 0u;
  const uint32_t raw_exp = (bits.u >> 23) & 0xFFu;
  if (raw_exp == 0u) return 0u;
  if (raw_exp == 0xFFu) return 0xFFFFFFFFu;
  const int exp = (int)raw_exp - 127;
  if (exp < 0) return 0u;
  if (exp > 31) return 0xFFFFFFFFu;
  uint32_t mantissa = (bits.u & 0x7FFFFFu) | 0x800000u;
  return exp >= 23 ? mantissa << (unsigned)(exp - 23) : mantissa >> (unsigned)(23 - exp);
}

static float fmm_uint_to_float(uint32_t value, uint32_t sign) {
  fmm_float_bits_t out;
  if (value == 0u) {
    out.u = sign << 31;
    return out.f;
  }
  unsigned msb = 31u;
  while (((value >> msb) & 1u) == 0u) --msb;
  uint32_t mantissa;
  if (msb <= 23u) mantissa = value << (23u - msb);
  else mantissa = value >> (msb - 23u);
  out.u = (sign << 31) | ((msb + 127u) << 23) | (mantissa & 0x7FFFFFu);
  return out.f;
}

float __floatunsisf(unsigned value) {
  return fmm_uint_to_float((uint32_t)value, 0u);
}

float __floatsisf(int value) {
  if (value < 0) {
    const uint32_t magnitude = (uint32_t)(-(value + 1)) + 1u;
    return fmm_uint_to_float(magnitude, 1u);
  }
  return fmm_uint_to_float((uint32_t)value, 0u);
}
