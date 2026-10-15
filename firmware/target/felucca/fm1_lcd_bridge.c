/* SPDX-License-Identifier: GPL-3.0-only
 * Minimal FMiniMug1 LCD bridge using Felucca's FM-1 SPI HAL.
 * The ST7789 init/transfer model follows the GPL Felucca hardware layer.
 */
#include "fm1_lcd_hw.h"
#include "fm1_time.h"
#include <stdint.h>

#define LCD_W 240
#define LCD_H 240

static uint8_t lcd_busy;
static uint8_t small[8];
static uint16_t fillbuf[240];

static void sync_lcd(void) {
  if (!lcd_busy) return;
  fm1_lcd_wait();
  fm1_lcd_deselect();
  lcd_busy = 0u;
}

static void cmd(uint8_t c) {
  sync_lcd();
  fm1_lcd_send_cmd(c);
  fm1_lcd_wait();
  fm1_lcd_deselect();
}

static void data(const void *p, uint32_t n) {
  if (!n) return;
  sync_lcd();
  fm1_lcd_send_data(p, n);
  lcd_busy = 1u;
}

static void window(uint32_t x0, uint32_t y0, uint32_t x1, uint32_t y1) {
  sync_lcd();
  small[0]=(uint8_t)(x0>>8); small[1]=(uint8_t)x0;
  small[2]=(uint8_t)(x1>>8); small[3]=(uint8_t)x1;
  cmd(0x2Au); data(small,4u);
  small[4]=(uint8_t)(y0>>8); small[5]=(uint8_t)y0;
  small[6]=(uint8_t)(y1>>8); small[7]=(uint8_t)y1;
  cmd(0x2Bu); data(small+4,4u);
  cmd(0x2Cu);
}

static void fill_rect(int x,int y,int w,int h,uint16_t c) {
  if (w<=0||h<=0||x>=LCD_W||y>=LCD_H) return;
  if (x<0) { w+=x; x=0; }
  if (y<0) { h+=y; y=0; }
  if (w<=0||h<=0) return;
  if (x+w>LCD_W) w=LCD_W-x;
  if (y+h>LCD_H) h=LCD_H-y;
  const uint16_t sw=(uint16_t)((c>>8)|(c<<8));
  uint32_t chunk=240u/(uint32_t)w*(uint32_t)w;
  if (!chunk) chunk=(uint32_t)w;
  if (chunk>240u) chunk=240u;
  sync_lcd();
  for (uint32_t i=0;i<chunk;i++) fillbuf[i]=sw;
  window((uint32_t)x,(uint32_t)y,(uint32_t)(x+w-1),(uint32_t)(y+h-1));
  uint32_t remain=(uint32_t)w*(uint32_t)h;
  while (remain) {
    uint32_t n=remain<chunk?remain:chunk;
    data(fillbuf,n*2u);
    remain-=n;
  }
}

#define GLYPH(a,b,c,d,e) ((uint16_t)(((a)<<12)|((b)<<9)|((c)<<6)|((d)<<3)|(e)))
static uint16_t glyph(char ch) {
  if (ch>='a'&&ch<='z') ch=(char)(ch-'a'+'A');
  switch(ch) {
    case 'A':return GLYPH(2,5,7,5,5); case 'B':return GLYPH(6,5,6,5,6);
    case 'C':return GLYPH(3,4,4,4,3); case 'D':return GLYPH(6,5,5,5,6);
    case 'E':return GLYPH(7,4,6,4,7); case 'F':return GLYPH(7,4,6,4,4);
    case 'G':return GLYPH(3,4,5,5,3); case 'H':return GLYPH(5,5,7,5,5);
    case 'I':return GLYPH(7,2,2,2,7); case 'J':return GLYPH(1,1,1,5,2);
    case 'K':return GLYPH(5,5,6,5,5); case 'L':return GLYPH(4,4,4,4,7);
    case 'M':return GLYPH(5,7,7,5,5); case 'N':return GLYPH(5,7,7,7,5);
    case 'O':return GLYPH(2,5,5,5,2); case 'P':return GLYPH(6,5,6,4,4);
    case 'Q':return GLYPH(2,5,5,7,3); case 'R':return GLYPH(6,5,6,5,5);
    case 'S':return GLYPH(3,4,2,1,6); case 'T':return GLYPH(7,2,2,2,2);
    case 'U':return GLYPH(5,5,5,5,7); case 'V':return GLYPH(5,5,5,5,2);
    case 'W':return GLYPH(5,5,7,7,5); case 'X':return GLYPH(5,5,2,5,5);
    case 'Y':return GLYPH(5,5,2,2,2); case 'Z':return GLYPH(7,1,2,4,7);
    case '0':return GLYPH(7,5,5,5,7); case '1':return GLYPH(2,6,2,2,7);
    case '2':return GLYPH(6,1,7,4,7); case '3':return GLYPH(6,1,3,1,6);
    case '4':return GLYPH(5,5,7,1,1); case '5':return GLYPH(7,4,6,1,6);
    case '6':return GLYPH(3,4,7,5,7); case '7':return GLYPH(7,1,2,2,2);
    case '8':return GLYPH(7,5,7,5,7); case '9':return GLYPH(7,5,7,1,6);
    case '-':return GLYPH(0,0,7,0,0); case '+':return GLYPH(0,2,7,2,0);
    case '/':return GLYPH(1,1,2,4,4); case '.':return GLYPH(0,0,0,0,2);
    case ':':return GLYPH(0,2,0,2,0); case '%':return GLYPH(5,1,2,4,5);
    case 39:return GLYPH(2,2,0,0,0); case '_':return GLYPH(0,0,0,0,7);
    case ' ':return 0u; default:return GLYPH(7,1,2,0,2);
  }
}

static void draw_char(int x,int y,char ch,uint16_t color) {
  const uint16_t g=glyph(ch);
  for (int row=0;row<5;row++) {
    const unsigned bits=(g>>(12-row*3))&7u;
    for (int col=0;col<3;col++) if (bits&(1u<<(2-col))) fill_rect(x+col*2,y+row*2,2,2,color);
  }
}

void fmm_felucca_lcd_init(void) {
  static const uint8_t seq[]={
    0x01,0, 0x00,150,
    0x11,0, 0x00,120,
    0x3A,1,0x55,
    0x36,1,0x00,
    0x21,0,
    0x13,0
  };
  fm1_lcd_hw_init();
  fm1_delay_ms(10u);
  for (uint32_t i=0;i<sizeof(seq);) {
    uint8_t c=seq[i++],n=seq[i++];
    if (c==0x00u) { fm1_delay_ms(n); continue; }
    cmd(c);
    if (n) { for(uint8_t k=0;k<n;k++) small[k]=seq[i+k]; data(small,n); i+=n; }
  }
  fm1_lcd_baud(4u);
  fill_rect(0,0,LCD_W,LCD_H,0u);
  cmd(0x29u);
  sync_lcd();
}

void fmm_felucca_lcd_begin(void) { sync_lcd(); }
void fmm_felucca_lcd_fill(uint16_t rgb565) { fill_rect(0,0,LCD_W,LCD_H,rgb565); }
void fmm_felucca_lcd_rect(int x,int y,int w,int h,uint16_t rgb565) { fill_rect(x,y,w,h,rgb565); }
void fmm_felucca_lcd_text(int x,int y,const char *text,uint16_t rgb565) {
  if (!text) return;
  for (;*text && x<LCD_W-6;text++,x+=8) draw_char(x,y,*text,rgb565);
}
void fmm_felucca_lcd_present(void) { sync_lcd(); }
