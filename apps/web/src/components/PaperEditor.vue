<template>
  <div
    ref="root"
    class="paper-editor"
    contenteditable="true"
    role="textbox"
    aria-multiline="true"
    aria-label="长文"
    @focus="focused = true"
    @blur="onBlur"
    @input="onInput"
    @paste="onPaste"
  />
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { htmlToPlain, pasteToPlain, plainToHtml, sanitizeArticleHtml } from "@yiyi/shared";

const props = defineProps<{ modelValue: string; originalHtml?: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const root = ref<HTMLElement | null>(null);
const focused = ref(false);

function paint() {
  if (!root.value || focused.value) return;
  const html = sanitizeArticleHtml(plainToHtml(props.modelValue, props.originalHtml || ""));
  root.value.innerHTML = html || "<p><br></p>";
}

onMounted(() => {
  void nextTick(paint);
});

watch(
  () => [props.modelValue, props.originalHtml],
  () => paint(),
);

function onInput() {
  if (!root.value) return;
  emit("update:modelValue", htmlToPlain(root.value.innerHTML));
}

function onBlur() {
  focused.value = false;
  paint();
}

function onPaste(ev: ClipboardEvent) {
  ev.preventDefault();
  const plain = pasteToPlain({
    text: ev.clipboardData?.getData("text/plain"),
    html: ev.clipboardData?.getData("text/html"),
  });
  if (!plain) return;
  document.execCommand("insertText", false, plain);
}
</script>
