#pragma once
#include "fm1_platform.h"

/* Render raw platform input state for first-device bring-up. This intentionally
 * bypasses synth UI mappings so physical matrix/button/encoder IDs can be
 * verified before enabling a flashable release. */
void fm_diag_render_input(const fm1_input_frame_t *input);
