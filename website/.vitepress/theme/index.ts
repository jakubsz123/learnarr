import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import SupportLinks from "./SupportLinks.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("SupportLinks", SupportLinks);
  },
} satisfies Theme;
