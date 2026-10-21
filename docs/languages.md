# Languages

Learnarr uses two kinds of language data. Both have their own licences.

## Frequency lists

`server/assets/frequency/<code>.txt` holds the 10,000 most common words of each language, most common
first. Learnarr uses them to show how common a word is and to count the common words as known for a
learner's level, so "% you know" starts near the truth.

They come from Hermit Dave's [FrequencyWords](https://github.com/hermitdave/FrequencyWords), counted over
the OpenSubtitles 2018 corpus, licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
The files here are an adaptation of it (top 10,000, lowercased, numbers and stray letters removed) and are
shared under the same licence. `node scripts/build-frequency.mjs` rebuilds them.

There is no list for Japanese (FrequencyWords splits it into word stems, not words) or Hindi (it has none).

## Lemmatiser models

[UDPipe 1](https://github.com/ufal/udpipe) (MPL 2.0) splits subtitles into words and finds each word's
dictionary form, so "comen" and "comí" both count as "comer". The Docker image includes the binary; outside
Docker, `scripts/fetch-udpipe.sh` installs it into `./data/udpipe`.

Its models are Milan Straka and Jana Straková, _Universal Dependencies 2.5 Models for UDPipe (2019-12-06)_,
LINDAT/CLARIAH-CZ, <http://hdl.handle.net/11234/1-3131>, licensed
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/): fine for a free, self-hosted app.
They aren't part of Learnarr: each install downloads the one it needs from lindat.mff.cuni.cz the first time
someone learns that language, into `/config/udpipe/models`. Each download is checked against a sha256 taken
from a real download, and thrown away if it doesn't match.

Models are set up for Czech, Danish, Dutch, English, French, German, Italian, Polish, Portuguese, Spanish
and Swedish (`server/utils/lemmas/models.ts`). Other languages still work: their words are split on spaces,
and there's no "% you know" for them yet.
