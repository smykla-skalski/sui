# Evaluation beyond the automated suite

The source laws, the in-page audit and the browser suite catch regressions. They cannot prove that people understand a component or that assistive technology announces it well, so these checks run by hand before a release that changes the components they name. Record each run, its date and its findings in the pull request that ships the change.

## Assistive technology

Run with VoiceOver on macOS and iOS, NVDA and JAWS on Windows, and TalkBack on Android.

- Combobox and the pair entry editor: `aria-activedescendant` into the listbox, the "Searching" and "Nothing matches" status, and the chosen value read back.
- Buttons and icon buttons while `loading` or `busy`: the busy state is announced and focus stays.
- Switch on and off, the checkbox's mixed state, and segmented control selection and its select fallback.
- The save bar's first appearance, a toast's announcement, ErrorState's alert and its retry label.
- The phone drawer: focus moves in, the rest is inert, and focus returns to the menu button.
- Charts: the figure name, the description and the data table.
- DiffBlock lines read as added, removed or changed, and the uppercase day headings.

## Devices

The long browser suite stands in for part of this on emulated touch screens, which share Chrome's layout but not a phone's own gestures, callouts or browser: the law audit on 820px and 1024px touch screens, a finger dragging the segmented thumb, a long press showing a time's and a cut label's tip, and the forced-colors marks of skeleton bars, the lit menu item and diff lines. Run the real devices for what emulation cannot show.

- A long press on a tooltip anchor (a clipped label, a time, an icon button) on iOS and Android: the tip opens and the native callout does not take over.
- The segmented control's thumb drag on a touch screen, and tapping a chip's remove control when chips wrap onto two lines.
- A touch tablet wider than 768px: every control is 44px tall.
- Windows High Contrast (forced colors): current and selected states, diff tones, menu highlights and skeleton bars stay visible.

## People

Run a moderated task test with five to eight readers per user type, and repeat after each round of changes.

- First use: can a new reader name the main action of a settings page and change a setting, including a list of pairs?
- Recognition: the `undo`, `filter`, `sort`, `refresh` and sidebar glyphs, the pill's dot and pulse, the "Unsaved" word and gold plate, and the "Override" and "Use inherited value" words.
- Navigation: the rail plus sidebar model on a desktop, and the bottom navigation plus drawer on a phone.
- Reading: whether the toast's five seconds are enough, and whether a heatmap and a range chart are read correctly with their legends.

## Production

Measure Largest Contentful Paint, Interaction to Next Paint and Cumulative Layout Shift at the 75th percentile on mobile and desktop in the products that use SUI, and profile long option lists, large tables and many relative times on one page.

`tests/browser/performance.test.mjs` holds lab stand-ins on a CPU about as fast as a mid-range phone (a laptop slowed four times, a CI runner as it is): loading the sink shifts layout by less than 0.1, a keystroke in a combobox of 5000 options and a sort of 500 table rows answer within 200ms, and a clock tick over 100 relative times holds no task past 50ms. Field data at the 75th percentile still decides.
