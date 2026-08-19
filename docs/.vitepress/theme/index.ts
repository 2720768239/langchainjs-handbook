import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import { defineAsyncComponent } from "vue";
import HomeShowcase from "./components/HomeShowcase.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component(
      "Playground",
      defineAsyncComponent(() => import("./components/Playground.vue")),
    );
    app.component("HomeShowcase", HomeShowcase);
  },
} satisfies Theme;
