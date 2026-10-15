#pragma once
#include <stdint.h>
static inline void fm1_lcd_hw_init(void){}
static inline void fm1_lcd_wait(void){}
static inline void fm1_lcd_deselect(void){}
static inline void fm1_lcd_send_cmd(uint8_t c){(void)c;}
static inline void fm1_lcd_send_data(const void *p,uint32_t n){(void)p;(void)n;}
static inline void fm1_lcd_baud(uint32_t b){(void)b;}
