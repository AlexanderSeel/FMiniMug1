#include "fm_diag.h"
#include <stdio.h>

#define COL_BG 0x0000u
#define COL_TEXT 0xFFFFu
#define COL_DIM 0x8410u
#define COL_ACCENT 0xFBE0u
#define COL_ACTIVE 0x07E0u

static unsigned popcount32(uint32_t v) {
  unsigned n = 0u;
  while (v) {
    v &= v - 1u;
    ++n;
  }
  return n;
}

void fm_diag_render_input(const fm1_input_frame_t *input) {
  if (!input) return;

  char line[40];
  fm1_platform_lcd_begin();
  fm1_platform_lcd_fill(COL_BG);
  fm1_platform_lcd_text(8, 7, "FMiniMug1 HW DIAG", COL_ACCENT);
  fm1_platform_lcd_text(8, 26, "RAW INPUT - NO FLASH", COL_DIM);

  snprintf(line, sizeof(line), "NOTES %02u  0x%08lX", popcount32(input->notes), (unsigned long)input->notes);
  fm1_platform_lcd_text(8, 50, line, input->notes ? COL_ACTIVE : COL_TEXT);
  snprintf(line, sizeof(line), "NP    0x%08lX", (unsigned long)input->note_pressed);
  fm1_platform_lcd_text(8, 68, line, COL_TEXT);
  snprintf(line, sizeof(line), "NR    0x%08lX", (unsigned long)input->note_released);
  fm1_platform_lcd_text(8, 86, line, COL_TEXT);

  snprintf(line, sizeof(line), "BTNS  %02u  0x%08lX", popcount32(input->buttons), (unsigned long)input->buttons);
  fm1_platform_lcd_text(8, 110, line, input->buttons ? COL_ACTIVE : COL_TEXT);
  snprintf(line, sizeof(line), "BP    0x%08lX", (unsigned long)input->button_pressed);
  fm1_platform_lcd_text(8, 128, line, COL_TEXT);

  snprintf(line, sizeof(line), "ENC 0-3 %+d %+d %+d %+d",
           input->encoder_delta[0], input->encoder_delta[1],
           input->encoder_delta[2], input->encoder_delta[3]);
  fm1_platform_lcd_text(8, 156, line, COL_TEXT);
  snprintf(line, sizeof(line), "ENC 4-6 %+d %+d %+d",
           input->encoder_delta[4], input->encoder_delta[5], input->encoder_delta[6]);
  fm1_platform_lcd_text(8, 174, line, COL_TEXT);

  fm1_platform_lcd_text(8, 204, "Verify IDs before UI mapping", COL_DIM);
  fm1_platform_lcd_text(8, 220, "Power-cycle exits diagnostic", COL_DIM);
  fm1_platform_lcd_present();
}
