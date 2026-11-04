# Studying

**Study** shows the cards that are due. Each card shows the line from the episode with the word highlighted.
Try to recall what the word means there, then press **Show answer** and say how it went:

| Button    | When                    | What happens                                        |
| --------- | ----------------------- | --------------------------------------------------- |
| **Again** | you didn't know it      | it comes back in a minute, and its interval shrinks |
| **Hard**  | you got it, with effort | a shorter interval than Good                        |
| **Good**  | you knew it             | the normal next interval                            |
| **Easy**  | it was obvious          | a longer interval                                   |

Each button shows when the card will come back. On a keyboard, space shows the answer and 1–4 answer.

Made a mistake? **Undo** (or `u`) takes back the last answer and shows the card again. Spotted a bad
translation? Press the pencil next to it and fix it.

## How the schedule works

Learnarr uses the SM-2 family of spaced repetition, the same idea Anki is built on:

- A new card is shown again after 1 minute, then 10 minutes, then the next day.
- After that, every time you know it, the gap grows: roughly 1 day, 3 days, a week, two and a half weeks,
  six weeks, and so on. **Easy** grows it faster, **Hard** slower.
- If you forget it, it goes back to short steps, and grows more slowly from then on.
- A card whose gap reaches three weeks counts as **known** for "% you know".

At most 20 new cards are introduced a day, so a long episode doesn't bury the reviews. Cards you don't get to
simply wait; there is no penalty for a missed day except that more is due the next.

Why this works is explained in [the method](./method).
