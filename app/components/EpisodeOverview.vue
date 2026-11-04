<template>
  <section class="panel overview">
    <CoverageBadge
      :coverage="coverage"
      size="lg"
      :empty-label="sub.transcript.lemmatised ? $t('coverage.noWords') : $t('coverage.notScored')"
    />
    <dl class="numbers">
      <div>
        <dt>{{ $t("episode.overview.words") }}</dt>
        <dd>{{ counted.length }}</dd>
      </div>
      <div>
        <dt>{{ $t("episode.overview.new") }}</dt>
        <dd>{{ counted.filter((v) => v.state === null).length }}</dd>
      </div>
      <div>
        <dt>{{ $t("nav.cards") }}</dt>
        <dd>{{ sub.cards.length }}</dd>
      </div>
    </dl>
    <p class="hint note" :class="{ danger: failed }">{{ note }}</p>
    <div class="row actions">
      <button v-if="failed" type="button" class="btn" @click="emit('retry')">
        {{ $t("common.tryAgain") }}
      </button>
      <UploadSubtitle :item-id="itemId" :label="$t('upload.replace')" @uploaded="emit('replaced')" />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { SubtitleResponse } from "~/utils/api";

/** "% you know", the episode's word counts, and where the analysis is. */
const props = defineProps<{ sub: SubtitleResponse; coverage: number | null; itemId: string }>();
const emit = defineEmits<{ retry: []; replaced: [] }>();

const { t } = useI18n();
const { languageName } = useLanguageNames();
const { reasonText } = useErrorMessage();

const counted = computed(() => props.sub.transcript.vocab.filter((v) => v.count > 0));
const failed = computed(
  () => props.sub.lemmas.state === "failed" || props.sub.lemmas.state === "model-failed",
);

const note = computed(() => {
  const status = props.sub.lemmas;
  const language = languageName(props.sub.subtitle.language);
  switch (status.state) {
    case "done":
      return t("episode.overview.done");
    case "working":
      return t("episode.overview.working");
    case "downloading-model":
      return status.percent !== null
        ? t("episode.overview.downloadingPercent", { language, percent: status.percent })
        : t("episode.overview.downloading", { language });
    case "failed":
      return status.message;
    case "model-failed":
      return reasonText(status.error, status.message);
    case "unsupported":
      return t("episode.overview.unsupported", { language });
    case "no-engine":
      return t("episode.overview.noEngine");
  }
  return "";
});
</script>

<style scoped>
.overview {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px 20px;
  align-items: center;
}

.numbers {
  display: flex;
  justify-content: flex-end;
  gap: 20px;
  margin: 0;
}

.numbers div {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.numbers dt {
  font-size: 12px;
  color: var(--muted);
}

.numbers dd {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.note,
.actions {
  grid-column: 1 / -1;
}
</style>
