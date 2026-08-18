<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
} from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import {
  bracketMatching,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
} from "@codemirror/language";
import {
  closeBrackets,
  closeBracketsKeymap,
  autocompletion,
  completionKeymap,
} from "@codemirror/autocomplete";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { oneDark } from "@codemirror/theme-one-dark";

const props = defineProps<{
  modelValue: string;
  readonly?: boolean;
}>();

const emit = defineEmits<{ (e: "update:modelValue", value: string): void }>();

const container = ref<HTMLElement | null>(null);
const { isDark } = useData();

let view: EditorView | null = null;
const themeCompartment = new Compartment();
const readonlyCompartment = new Compartment();

const lightTheme = [syntaxHighlighting(defaultHighlightStyle, { fallback: true })];

function themeExtension(dark: boolean) {
  return dark ? oneDark : lightTheme;
}

onMounted(() => {
  view = new EditorView({
    parent: container.value!,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        javascript({ typescript: true }),
        themeCompartment.of(themeExtension(isDark.value)),
        readonlyCompartment.of(EditorState.readOnly.of(!!props.readonly)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            emit("update:modelValue", update.state.doc.toString());
          }
        }),
        EditorView.theme({
          "&": { height: "100%", fontSize: "13.5px" },
          ".cm-scroller": {
            fontFamily:
              "var(--vp-font-family-mono, ui-monospace, 'JetBrains Mono', Consolas, monospace)",
            lineHeight: "1.65",
          },
          "&.cm-focused": { outline: "none" },
        }),
      ],
    }),
  });
});

watch(isDark, (dark) => {
  view?.dispatch({ effects: themeCompartment.reconfigure(themeExtension(dark)) });
});

watch(
  () => props.readonly,
  (ro) => {
    view?.dispatch({
      effects: readonlyCompartment.reconfigure(EditorState.readOnly.of(!!ro)),
    });
  },
);

// 外部切换练习时同步编辑器内容
watch(
  () => props.modelValue,
  (value) => {
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    }
  },
);

onBeforeUnmount(() => {
  view?.destroy();
  view = null;
});
</script>

<template>
  <div ref="container" class="code-editor" />
</template>

<style scoped>
.code-editor {
  height: 100%;
  overflow: hidden;
}
.code-editor :deep(.cm-editor) {
  height: 100%;
  background: var(--vp-c-bg);
}
</style>
