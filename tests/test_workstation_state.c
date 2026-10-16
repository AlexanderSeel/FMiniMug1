#include <assert.h>
#include <stdio.h>
#include "fm_workstation_state.h"

int main(void) {
  fmw_ui_state_t s;
  fmw_ui_state_init(&s);
  assert(s.part == FMW_PART_MINI);
  assert(s.focus_encoder == 0xffu);
  assert(fmw_ui_page_desc(&s));
  assert(fmw_ui_page_desc(&s)->title[0] == 'O');

  fmw_ui_next_part(&s, 1);
  assert(s.part == FMW_PART_DRUM808);
  assert(fmw_ui_part_desc(&s)->page_count == 5u);
  assert(fmw_ui_page_desc(&s)->title[0] == 'K');

  fmw_ui_next_page(&s, 1);
  assert(s.page[FMW_PART_DRUM808] == 1u);
  assert(fmw_ui_page_desc(&s)->title[0] == 'T');

  fmw_ui_toggle_focus(&s, 2u);
  assert(s.focus_encoder == 2u);
  fmw_ui_toggle_focus(&s, 2u);
  assert(s.focus_encoder == 0xffu);

  fmw_ui_set_hold(&s, 1);
  assert(s.hold == 1u);

  fmw_ui_select_part(&s, FMW_PART_ALPHA);
  assert(s.part == FMW_PART_ALPHA);
  assert(fmw_ui_page_desc(&s)->title[0] == 'A'); /* Alpha Dial home */
  fmw_ui_next_page(&s, -1);
  assert(s.page[FMW_PART_ALPHA] == 7u);
  assert(fmw_ui_page_desc(&s)->title[0] == 'S');

  fmw_ui_next_part(&s, 1);
  assert(s.part == FMW_PART_MINI);
  assert(s.page[FMW_PART_DRUM808] == 1u); /* per-part page memory */

  puts("workstation state ok");
  return 0;
}
