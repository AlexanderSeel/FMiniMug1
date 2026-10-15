/* SPDX-License-Identifier: GPL-3.0-only
 * Freestanding string subset for the JieLi target include path.
 */
#pragma once
#include <stddef.h>

void *memset(void *dst, int value, size_t size);
void *memcpy(void *dst, const void *src, size_t size);
int memcmp(const void *a, const void *b, size_t size);
