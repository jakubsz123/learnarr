# Anki

You can study in Learnarr, in [Anki](https://apps.ankiweb.net), or both. There are two ways to get cards into
Anki.

## Send to Anki (AnkiConnect)

If Anki runs on the computer you use Learnarr on:

1. Install the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on.
2. In Anki, open _Tools → Add-ons → AnkiConnect → Config_ and add Learnarr's address to `webCorsOriginList`,
   for example `"http://192.168.1.10:7979"`. Restart Anki.
3. In Learnarr, set the deck in **Settings → Account**, then press **Send to Anki** on the **Cards** page.

Your browser talks to Anki directly; Learnarr's server never connects to it. Learnarr creates a "Learnarr"
note type (Term, Translation, Sentence, Note, Source) the first time, and remembers which cards it has sent, so
pressing the button again only sends new ones.

## Export a file

**Export for Anki** on the **Cards** page downloads your cards as a tab-separated file that Anki imports with _File →
Import_. Pick "Tab" as the separator and map the fields in order: Term, Translation, Sentence, Note, Source.
This works without AnkiConnect, and with other flashcard apps that read CSV or TSV.

If you study in Anki, there's no need to also study in Learnarr; your cards in Learnarr still count towards
"% you know" only through the words you mark known.
