#pragma once
#include "fm_app.h"

/* Target-only hooks used by the JieLi/Felucca bring-up entry point.
 * These are intentionally outside fm1_platform.h because ALNK0 must be serviced
 * from the hardware ISR on the real device, while host/WASM builds use polling. */

void fmm_felucca_bind_app(fm_app_t *app);
void fmm_felucca_audio_irq(void);
void fmm_felucca_input_tick(void);

/* Raw diagnostic loop helper: poll the proven Felucca matrix scanner and render
 * fm_diag_render_input() without enabling flash writes or installer behavior. */
void fmm_felucca_diag_step(void);
