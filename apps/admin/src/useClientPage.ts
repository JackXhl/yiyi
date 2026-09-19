import { computed, ref, type Ref } from "vue";

export function useClientPage<T>(items: Ref<T[]>, pageSize = 10) {
  const page = ref(1);
  const paged = computed(() => items.value.slice((page.value - 1) * pageSize, page.value * pageSize));
  function reset() {
    page.value = 1;
  }
  return { page, pageSize, paged, reset };
}
