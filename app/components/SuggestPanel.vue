<template>
  <section class="panel stack">
    <div class="row-between">
      <h2 class="panel-title">{{ $t("episode.suggest.title") }}</h2>
      <NuxtLink v-if="hasCards" to="/study" class="btn">{{ $t("nav.study") }}</NuxtLink>
    </div>
    <template v-if="me && !me.aiConfigured">
      <p class="muted">{{ $t("episode.suggest.noAi") }}</p>
      <NuxtLink v-if="me.isAdmin" to="/settings/ai" class="btn btn-primary">
        {{ $t("episode.suggest.setUpAi") }}
      </NuxtLink>
      <p v-else class="hint">{{ $t("episode.suggest.askAdmin") }}</p>
    </template>
    <template v-else>
      <p class="muted">{{ asked ? $t("episode.suggest.introMore") : $t("episode.suggest.intro") }}</p>
      <div class="row" role="group" :aria-label="$t('episode.suggest.howMany')">
        <button
          v-for="n in WORD_COUNTS"
          :key="n"
          type="button"
          class="pill"
          :aria-pressed="count === n ? 'true' : 'false'"
          @click="count = n"
        >
          {{ n }}
        </button>
        <button type="button" class="btn btn-primary" :disabled="working" @click="suggest">
          {{
            working
              ? $t("episode.suggest.busy")
              : asked
                ? $t("episode.suggest.more")
                : $t("episode.suggest.button")
          }}
        </button>
      </div>
      <p v-if="working" class="hint">{{ $t("episode.suggest.wait") }}</p>
      <Feedback :text="feedback.text.value" :ok="feedback.ok.value" />
    </template>
  </section>
</template>

<script setup lang="ts">
import { WORD_COUNTS } from "#shared/words";

/** Ask the AI to read the subtitle and suggest words; the suggestions appear below when it's done. */
const props = defineProps<{ subtitleId: number; asked: boolean; hasCards: boolean }>();
const emit = defineEmits<{ done: [] }>();

const { t } = useI18n();
const { me } = useMe();
const waitFor = useJob();
const feedback = useFeedback();
const count = ref<(typeof WORD_COUNTS)[number]>(20);
const working = computed(() => feedback.busy.value);

function suggest() {
  return feedback.run(
    async () => {
      const { jobId } = await api<{ jobId: string }>(`/api/subtitles/${props.subtitleId}/words`, {
        method: "POST",
        body: { count: count.value },
      });
      const result = (await waitFor(jobId)) as { added: number } | null;
      emit("done");
      return result?.added ?? 0;
    },
    (added) => (added ? t("episode.suggest.added", { count: added }) : t("episode.suggest.none")),
  );
}
</script>
