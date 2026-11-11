# Languages

Learnarr works with any language your subtitles are in: suggestions, cards, the transcript and studying work
for all of them. Two things depend on language data:

- **"% you know"** needs a lemmatiser model, which matches every word to its dictionary form.
- **How common a word is** needs a frequency list.

## What each language has

<LanguageTable />

A language with neither still works: its words are split on spaces, and there's no score.

## Lemmatiser models

Learnarr uses [UDPipe](https://github.com/ufal/udpipe) with the Universal Dependencies 2.5 models from
LINDAT/CLARIAH-CZ. They aren't part of the Docker image: each server downloads the one it needs the first time
someone learns a language (15–60 MB), into `/config/udpipe/models`. Every download is checked against a
checksum taken from a real download, and thrown away if it doesn't match.

To download a model ahead of time, or try again after a failed download, use **System → Status → Languages**.

Where a language has several treebanks, Learnarr picks the one with the best lemmas and the most everyday text
(German HDT, English EWT, Chinese GSDSimp for simplified characters). Korean is left out: its models give
morpheme chains rather than dictionary forms. Japanese and Chinese are written without spaces; UDPipe splits
them into words.

The models are licensed [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/): fine for a free,
self-hosted app.

## Frequency lists

The 10,000 most common words of each language, from Hermit Dave's
[FrequencyWords](https://github.com/hermitdave/FrequencyWords), counted over film and TV subtitles from
OpenSubtitles (CC BY-SA 4.0). They're part of Learnarr itself.

## Spotted a wrong lemma?

The models are trained on written text, so slang, dialect and very short lines trip them up. Mark a misread
word known and it's fixed everywhere. If a language looks wrong more often than that,
[open an issue](https://github.com/smoothless-io/learnarr/issues/new?template=language.yml) with a few examples:
another treebank may do better.
