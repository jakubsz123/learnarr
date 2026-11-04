# "% you know"

"% you know" is the share of an episode's running words that you already know. If an episode has 6,000 words
of dialogue and you know the words behind 5,700 of them, it says 95%.

## How it's counted

1. The subtitle is split into words, and each word is matched to its **dictionary form** (its _lemma_) by
   [UDPipe](https://github.com/ufal/udpipe). "Fueron" and "voy" both count as _ir_.
2. **Every use counts.** A word said 40 times counts 40 times. That's what makes the number match how much of
   the dialogue you'd follow: knowing _que_ matters more than knowing a word said once.
3. Some things are **left out** of the count: names (UDPipe tags them as proper nouns), numbers, punctuation
   and symbols. Not knowing a character's name isn't a gap in your vocabulary.
4. A word counts as **known** if:
   - you marked it known, or chose _I know it_ for a suggestion;
   - it's one of the most common words for your level (100 for beginner, 1,500 for intermediate, 4,000 for
     advanced), unless you unmarked it;
   - you have a card for it that has matured (reviewed out to an interval of three weeks or more).

A card that's still being learned doesn't count yet: you're learning it, but you'd likely miss it at full speed.

## Reading the number

| Score      | Label      | What it means                                                             |
| ---------- | ---------- | ------------------------------------------------------------------------- |
| 98% and up | Easy going | You'll follow almost everything.                                          |
| 95–98%     | Just right | You'll follow, and the new words stand out. The best range to learn from. |
| 85–95%     | A stretch  | You'll follow with effort; a lot to learn. Prepare the words first.       |
| below 85%  | Hard going | Most lines have a gap. Study first, watch later.                          |

These thresholds come from research on reading ([the method](./method) has the references). Listening is
supported by sound, faces and situation, so the same score is usually easier to watch than to read.

## Why it may be off

- **At first, it only knows your level's common words.** Tick the words you know in an episode's **Words** tab
  for your first few episodes, and every later score improves.
- **The tagger makes mistakes**, especially with slang, dialect and very short lines. A misread word may show
  as new when you know it; mark it known and it's fixed everywhere.
- **No score** ("—") means the subtitle hasn't been analysed: it's still working, the model for the language is
  downloading, or there's no model for that language. See [Languages](./languages).
