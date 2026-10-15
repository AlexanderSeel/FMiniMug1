/* SPDX-License-Identifier: GPL-3.0-only
 * FMiniMug1 Felucca target adapter helpers.
 *
 * This target-only layer is intended to be built together with Felucca's
 * GPL-3.0-only FM-1 HAL. Portable FMiniMug1 code does not include this file.
 */
#pragma once
#include <stdint.h>
#include "fm1_platform.h"

typedef void (*fm1_felucca_audio_renderer_t)(fm1_audio_block_t *block, void *user);

/* IRQ ownership stays in the one translation unit that includes Felucca's
 * fm1_irq.h, avoiding duplicate fault-dispatch definitions. */
void fm1_felucca_irq_init(void);
void fm1_felucca_irq_enable(void);

/* Register the real-time renderer called from the ALNK0 half-buffer IRQ. */
void fm1_felucca_set_audio_renderer(fm1_felucca_audio_renderer_t renderer, void *user);

/* Enable ALNK0 once the application/runtime object is initialized. */
void fm1_felucca_audio_start(void);
void fm1_felucca_audio_stop(void);

/* Exact rate implied by Felucca's 24 MHz / 544 ALNK clocking. */
float fmm_felucca_sample_rate(void);

/* Felucca's assembly IRQ wrappers call these symbols. TIMER5 remains a no-op
 * in the first polled-input bring-up target. */
void fm1_alnk0_irq(void);
void fm1_timer5_irq(void);

/* Read-only bring-up policy: remains zero until flash-write gates are met. */
int fm1_felucca_flash_write_enabled(void);
