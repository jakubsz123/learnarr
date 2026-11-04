import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import LanguageTable from "./LanguageTable.vue";
import SupportLinks from "./SupportLinks.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("SupportLinks", SupportLinks);
    app.component("LanguageTable", LanguageTable);
  },
} satisfies Theme;
