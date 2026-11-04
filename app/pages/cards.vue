<template>
  <div class="page">
    <div class="row-between">
      <h1 class="page-title">{{ $t("nav.cards") }}</h1>
      <div class="row">
        <a class="btn" href="/api/cards/export" download>
          <AppIcon name="download" :size="18" /> {{ $t("cardsPage.export") }}
        </a>
        <button
          v-if="pending.length"
          type="button"
          class="btn"
          :disabled="anki.busy.value"
          @click="sendToAnki"
        >
          <AppIcon name="anki" :size="18" />
          {{
            anki.busy.value ? $t("cardsPage.sending") : $t("cardsPage.sendToAnki", { count: pending.length })
          }}
        </button>
      </div>
    </div>
    <Feedback :text="anki.text.value" :ok="anki.ok.value" />

    <div class="section">
      <SearchField
        v-model="search"
        :label="$t('cardsPage.search')"
        :placeholder="$t('cardsPage.searchPlaceholder')"
      />
      <div class="pills" role="group" :aria-label="$t('cardsPage.show')">
        <button
          v-for="f in CARD_FILTERS"
          :key="f"
          type="button"
          class="pill"
          :aria-pressed="filter === f ? 'true' : 'false'"
          @click="filter = f"
        >
          {{ $t(`cardsPage.filters.${f}`) }}
        </button>
      </div>
    </div>

    <p v-if="error" class="notice danger" role="alert">{{ error }}</p>

    <ul v-if="cards.length" class="list-box">
      <li v-for="card in cards" :key="card.id">
        <CardItem :card="card" @updated="(c) => Object.assign(card, c)">
          <div class="item-foot">
            <span class="hint">
              <NuxtLink
                v-if="card.source?.serverItemId"
                :to="`/media/${card.source.serverItemId}`"
                class="plain-link"
              >
                {{ sourceTitle(card.source) }}
              </NuxtLink>
              <template v-if="card.ankiNoteId"> · {{ $t("cardsPage.inAnki") }}</template>
            </span>
            <span class="row">
              <button
                type="button"
                class="icon-btn"
                :aria-label="
                  $t(card.suspended ? 'cardsPage.resumeNamed' : 'cardsPage.suspendNamed', { term: card.term })
                "
                :title="$t(card.suspended ? 'cardsPage.resume' : 'cardsPage.suspend')"
                @click="toggleSuspend(card)"
              >
                <AppIcon :name="card.suspended ? 'play' : 'pause'" :size="18" />
              </button>
              <button
                type="button"
                class="icon-btn danger"
                :aria-label="$t('cardsPage.deleteNamed', { term: card.term })"
                :title="$t('users.delete')"
                @click="remove(card)"
              >
                <AppIcon name="trash" :size="18" />
              </button>
            </span>
          </div>
        </CardItem>
      </li>
    </ul>
    <p v-else-if="!loading" class="muted">
      {{ search || filter !== "all" ? $t("cardsPage.noMatch") : $t("cardsPage.empty") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { CARD_FILTERS } from "#shared/srs";
import type { AnkiCard, ListedCard } from "~/utils/api";

const SEARCH_DELAY_MS = 300;

const { t } = useI18n();
useHead({ title: () => `${t("nav.cards")} · Learnarr` });

const { me } = useMe();
const { errorText } = useErrorMessage();
const cards = ref<ListedCard[]>([]);
const search = ref("");
const filter = ref<(typeof CARD_FILTERS)[number]>("all");
const loading = ref(true);
const error = ref("");
const pending = ref<AnkiCard[]>([]);
const anki = useFeedback();

async function load() {
  loading.value = true;
  try {
    const query = { search: search.value || undefined, filter: filter.value };
    cards.value = (await api<{ cards: ListedCard[] }>("/api/cards", { query })).cards;
    pending.value = (await api<{ cards: AnkiCard[] }>("/api/cards/anki")).cards;
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
}

async function toggleSuspend(card: ListedCard) {
  try {
    await api(`/api/cards/${card.id}`, { method: "PATCH", body: { suspended: !card.suspended } });
    card.suspended = !card.suspended;
  } catch (e) {
    error.value = errorText(e);
  }
}

async function remove(card: ListedCard) {
  if (!window.confirm(t("cardsPage.confirmDelete", { term: card.term }))) return;
  try {
    await api(`/api/cards/${card.id}`, { method: "DELETE" });
    cards.value = cards.value.filter((c) => c.id !== card.id);
    pending.value = pending.value.filter((c) => c.id !== card.id);
  } catch (e) {
    error.value = errorText(e);
  }
}

function sendToAnki() {
  const settings = me.value?.anki;
  if (!settings) return;
  return anki.run(
    async () => {
      const added = await useAnki().push(settings.url, settings.deck, pending.value);
      await load();
      return added;
    },
    (added) => t("cardsPage.sent", { count: added, deck: settings.deck }),
  );
}

let timer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(timer);
  timer = setTimeout(load, SEARCH_DELAY_MS);
});
watch(filter, load);
onMounted(load);
</script>

<style scoped>
.item-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: -4px -8px -8px 0;
}

.plain-link {
  color: inherit;
}
</style>
