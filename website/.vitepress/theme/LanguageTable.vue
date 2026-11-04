<template>
  <p>
    {{ rows.filter((r) => r.treebank).length }} of {{ rows.length }} languages have "% you know";
    {{ rows.filter((r) => r.frequency).length }} have a frequency list.
  </p>
  <table>
    <thead>
      <tr>
        <th>Language</th>
        <th>"% you know"</th>
        <th>Frequency list</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.code">
        <td>
          {{ row.name }} <code>{{ row.code }}</code>
        </td>
        <td>{{ row.treebank ? `✓ (${row.treebank.split("-").pop()})` : "—" }}</td>
        <td>{{ row.frequency ? "✓" : "—" }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
// @ts-expect-error VitePress resolves data loaders at build time.
import { data as rows } from "./languages.data";
</script>
