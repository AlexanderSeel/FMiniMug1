#include "fm_diag.h"

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

static char *putc1(char *p, char c) { *p++ = c; return p; }
static char *puts1(char *p, const char *s) { while (*s) *p++ = *s++; return p; }
static char *hex8(char *p, uint32_t v) {
  static const char h[] = "0123456789ABCDEF";
  for (int n = 7; n >= 0; --n) *p++ = h[(v >> (unsigned)(n * 4)) & 15u];
  return p;
}
static char *u2(char *p, unsigned v) {
  *p++ = (char)('0' + (v / 10u) % 10u);
  *p++ = (char)('0' + v % 10u);
  return p;
}
static char *signed_small(char *p, int v) {
  if (v >= 0) *p++ = '+';
  else { *p++ = '-'; v = -v; }
  if (v > 999) v = 999;
  if (v >= 100) *p++ = (char)('0' + v / 100);
  if (v >= 10) *p++ = (char)('0' + (v / 10) % 10);
  *p++ = (char)('0' + v % 10);
  return p;
}
static void end(char *p) { *p = 0; }

void fm_diag_render_input(const fm1_input_frame_t *input) {
  if (!input) return;

  char line[40];
  char *p;
  fm1_platform_lcd_begin();
  fm1_platform_lcd_fill(COL_BG);
  fm1_platform_lcd_text(8, 7, "FMiniMug1 HW DIAG", COL_ACCENT);
  fm1_platform_lcd_text(8, 26, "RAW INPUT - NO FLASH", COL_DIM);

  p = line; p = puts1(p, "NOTES "); p = u2(p, popcount32(input->notes)); p = puts1(p, "  0x"); p = hex8(p, input->notes); end(p);
  fm1_platform_lcd_text(8, 50, line, input->notes ? COL_ACTIVE : COL_TEXT);
  p = line; p = puts1(p, "NP    0x"); p = hex8(p, input->note_pressed); end(p);
  fm1_platform_lcd_text(8, 68, line, COL_TEXT);
  p = line; p = puts1(p, "NR    0x"); p = hex8(p, input->note_released); end(p);
  fm1_platform_lcd_text(8, 86, line, COL_TEXT);

  p = line; p = puts1(p, "BTNS  "); p = u2(p, popcount32(input->buttons)); p = puts1(p, "  0x"); p = hex8(p, input->buttons); end(p);
  fm1_platform_lcd_text(8, 110, line, input->buttons ? COL_ACTIVE : COL_TEXT);
  p = line; p = puts1(p, "BP    0x"); p = hex8(p, input->button_pressed); end(p);
  fm1_platform_lcd_text(8, 128, line, COL_TEXT);

  p = line; p = puts1(p, "ENC 0-3 ");
  for (int i = 0; i < 4; ++i) { p = signed_small(p, input->encoder_delta[i]); if (i != 3) p = putc1(p, ' '); }
  end(p);
  fm1_platform_lcd_text(8, 156, line, COL_TEXT);
  p = line; p = puts1(p, "ENC 4-6 ");
  for (int i = 4; i < 7; ++i) { p = signed_small(p, input->encoder_delta[i]); if (i != 6) p = putc1(p, ' '); }
  end(p);
  fm1_platform_lcd_text(8, 174, line, COL_TEXT);

  fm1_platform_lcd_text(8, 204, "Verify IDs before UI mapping", COL_DIM);
  fm1_platform_lcd_text(8, 220, "Power-cycle exits diagnostic", COL_DIM);
  fm1_platform_lcd_present();
}
