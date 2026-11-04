# The method

Learnarr is built on a few well-established findings about how people learn vocabulary in a second language.
None of them are new; what Learnarr adds is doing the bookkeeping for you, on the films and series you
actually watch.

## 1. You learn from input you mostly understand

Most of a language is picked up by understanding messages in it: reading and listening to things that are a
little beyond your current level, but not too far. Stephen Krashen called this _comprehensible input_ (his
"i+1"), and while researchers argue about the details, the core claim is widely accepted: you learn most from
material you can follow.

"Can follow" has been measured. Studies of reading found that learners need to know about **95%** of the
running words of a text to understand it adequately, and about **98%** to understand it comfortably without
help (Laufer, 1989; Hu & Nation, 2000; Laufer & Ravenhorst-Kalovski, 2010). Listening seems to tolerate a
little less coverage, but the shape is the same: below a threshold, every line has a gap, comprehension
collapses and learning from context stops.

That's what **"% you know"** measures for every episode: the share of its running words you already know. It
tells you which episodes you can learn _from_ and which you'd only learn _for_. See
["% you know"](./coverage) for exactly how it's counted.

## 2. TV needs a known, reachable vocabulary

Webb and Rodgers analysed the subtitles of hundreds of films and TV programmes. Knowing the most frequent
**3,000 word families** of English, plus proper nouns and interjections, covered about **95%** of the words in
films and TV; reaching **98%** took about 6,000–7,000 (Webb & Rodgers, 2009a, 2009b). Other languages differ in
the details, but everyday speech always leans heavily on a few thousand frequent words.

Two practical consequences shape Learnarr:

- **Frequency first.** A word that appears in every episode is worth more than one that appears once.
  Learnarr ranks every word against a frequency list built from film and TV subtitles
  ([FrequencyWords](https://github.com/hermitdave/FrequencyWords), from OpenSubtitles), shows how common each
  word is, and lists an episode's new words most common first.
- **Series beat films.** A series repeats its vocabulary from episode to episode, so the words you learn for
  one episode pay off in the next. Learnarr is organised around shows and their next episode for that reason.

## 3. Words are learned in context

A word met in a real sentence is remembered better, and used more accurately, than a word met in a list.
Every Learnarr card carries the line from the episode where the word was said, with the word highlighted. You
are asked what the word means _there_, not in general, so you learn the sense the show actually uses, and you'll
recognise the line when you hear it.

## 4. Retrieval and spacing make it stick

Two of the most robust findings in learning research:

- **The testing effect.** Trying to recall something strengthens memory more than reading it again (Roediger &
  Karpicke, 2006). That's why a card asks before it answers.
- **The spacing effect.** Reviews spread over time beat the same reviews crammed together, and the best gap
  grows as memory gets stronger (Cepeda et al., 2006, review hundreds of experiments).

Learnarr schedules reviews with SM-2, the algorithm behind SuperMemo and Anki: each successful recall pushes
the next review further away, and a lapse brings it back. See [Studying](./studying).

## 5. Learn what you need, skip what you know

The slowest part of mining vocabulary yourself is deciding which words to bother with. Learnarr does it in
three layers:

1. **Lemmatisation** finds each word's dictionary form ("comí", "comen" and "comiendo" are all _comer_), so
   knowing a word once counts everywhere it appears. This uses [UDPipe](https://github.com/ufal/udpipe), a
   linguistic tagger trained on the Universal Dependencies treebanks.
2. **Known words** start from the most common words for your level and grow every time you mark a word or a
   card matures. The more you tell Learnarr, the more accurate everything gets.
3. **AI suggestions** read the whole episode and pick the words worth learning at your level, with a
   translation for that context. They are suggestions, not cards: you decide what to learn, which keeps the
   study queue full of words you actually want.

## 6. Watch the episode

The last step is the one that matters most: watch the episode you prepared. The words you just studied come
up in their real context, often several times, and every time you understand one, it's another review that
no app scheduled. The flashcards exist to make that viewing comprehensible; the viewing does the rest.

## References

- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal
  recall tasks: A review and quantitative synthesis. _Psychological Bulletin_, 132(3), 354–380.
- Hu, M., & Nation, I. S. P. (2000). Unknown vocabulary density and reading comprehension. _Reading in a
  Foreign Language_, 13(1), 403–430.
- Krashen, S. (1985). _The Input Hypothesis: Issues and Implications_. Longman.
- Laufer, B. (1989). What percentage of text-lexis is essential for comprehension? In C. Lauren & M. Nordman
  (Eds.), _Special Language: From Humans Thinking to Thinking Machines_ (pp. 316–323). Multilingual Matters.
- Laufer, B., & Ravenhorst-Kalovski, G. C. (2010). Lexical threshold revisited: Lexical text coverage,
  learners' vocabulary size and reading comprehension. _Reading in a Foreign Language_, 22(1), 15–30.
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term
  retention. _Psychological Science_, 17(3), 249–255.
- Webb, S., & Rodgers, M. P. H. (2009a). The lexical coverage of movies. _Applied Linguistics_, 30(3),
  407–427.
- Webb, S., & Rodgers, M. P. H. (2009b). Vocabulary demands of television programs. _Language Learning_,
  59(2), 335–366.
