<template>
  <div v-if="article">
    <div class="steps">
      <span v-for="s in steps" :key="s.id" :class="{ now: node === s.id }" @click="node = s.id">{{ s.label }}</span>
    </div>

    <section v-show="node === 'topic'">
      <p class="hint">先点三个选项，再写一句话和两条你亲历过的事。</p>
      <div class="field">
        <label>这批稿发成什么样</label>
        <div class="chips">
          <button v-for="o in options.form" :key="o.code" type="button" class="chip" :class="{ on: article.formCode === o.code }" @click="article.formCode = o.code">{{ o.labelZh }}</button>
        </div>
      </div>
      <div class="field">
        <label>看完你想让人怎样</label>
        <div class="chips">
          <button v-for="o in options.intent" :key="o.code" type="button" class="chip" :class="{ on: article.intentCode === o.code }" @click="article.intentCode = o.code">{{ o.labelZh }}</button>
        </div>
      </div>
      <div class="field">
        <label>大概写哪一类</label>
        <div class="chips">
          <button v-for="o in options.topicL1" :key="o.code" type="button" class="chip" :class="{ on: article.topicCodes?.includes(o.code) }" @click="toggleTopic(o.code)">{{ o.labelZh }}</button>
        </div>
        <p class="hint">更多</p>
        <div class="chips">
          <button v-for="o in options.topicMore" :key="o.code" type="button" class="chip" :class="{ on: article.topicCodes?.includes(o.code) }" @click="toggleTopic(o.code)">{{ o.labelZh }}</button>
        </div>
      </div>
      <div class="field">
        <label>用一句话说这篇写什么</label>
        <t-input v-model="article.theme" placeholder="例如：我把店里那根闪了两周的灯管换了" />
      </div>
      <div class="field" v-for="(a, i) in article.anchors" :key="a.id">
        <label>锚点 {{ i + 1 }}（亲历、可核对）</label>
        <t-textarea v-model="a.text" :autosize="{ minRows: 2 }" placeholder="写你自己碰到的具体事" @change="a.confirmed = a.text.trim().length >= 4" />
      </div>
      <p class="hint">风格默认系统，可不改。</p>
      <t-button theme="primary" :disabled="!!gateReason" @click="save(); node = 'media'">下一步</t-button>
      <p class="err" v-if="gateReason">{{ gateReason }}</p>
    </section>

    <section v-show="node === 'media'">
      <div class="upload">
        把现场照片或短视频拖到这里，或
        <input type="file" multiple accept="image/*,video/mp4" @change="onFiles" />
      </div>
      <div class="thumbs">
        <div class="card-asset" v-for="as in article.assets" :key="as.id">
          <img v-if="as.kind === 'image'" :src="as.url" alt="" />
          <div v-else class="ph">短视频</div>
          <p class="hint">{{ as.analysis?.caption }}</p>
          <t-button size="small" theme="primary" variant="outline" @click="confirmAsset(as.id)">用这条当锚点</t-button>
        </div>
      </div>
      <p style="margin-top: 16px">
        <t-button variant="outline" @click="node = 'topic'">上一步</t-button>
        <t-button theme="primary" style="margin-left: 8px" :disabled="!!gateReason" @click="run">按这个写</t-button>
      </p>
      <p class="err" v-if="gateReason">{{ gateReason }}</p>
      <p class="hint" v-if="article.status === 'generating'">正在写大纲</p>
      <div class="progress" v-if="article.status === 'generating'" />
    </section>

    <section v-show="node === 'outline'" class="split">
      <div>
        <label>大纲（可改，不强制通过）</label>
        <t-textarea v-model="article.outline" :autosize="{ minRows: 16 }" />
      </div>
      <div>
        <p class="hint">结构先于文采。想直接看正文就点下一步。</p>
        <t-button theme="primary" @click="save(); node = 'body'">看正文</t-button>
      </div>
    </section>

    <section v-show="node === 'body'" class="split">
      <div>
        <label>长文（可改）</label>
        <t-textarea v-model="article.bodyLong" :autosize="{ minRows: 18 }" />
      </div>
      <div>
        <div class="chips">
          <button type="button" class="chip" :class="{ on: preview === 'desk' }" @click="preview = 'desk'">电脑宽</button>
          <button type="button" class="chip" :class="{ on: preview === 'mp' }" @click="preview = 'mp'">公众号宽</button>
          <button type="button" class="chip" :class="{ on: preview === 'note' }" @click="preview = 'note'">笔记宽</button>
        </div>
        <div class="preview" :class="preview" v-html="preview === 'note' ? noteHtml : article.bodyLong" />
        <p style="margin-top: 16px">
          <t-button theme="primary" @click="save(); node = 'adapt'">去适配</t-button>
        </p>
      </div>
    </section>

    <section v-show="node === 'adapt'">
      <label>笔记文案</label>
      <t-textarea v-model="article.bodyNote" :autosize="{ minRows: 8 }" />
      <p class="hint">小红书按这个顺序传图。不代发。可上移、拿掉某张。</p>
      <div class="thumbs">
        <div class="card-asset" v-for="(as, i) in imageAssets" :key="as.id">
          <img :src="as.url" alt="" />
          <p class="hint">第 {{ i + 1 }} 张{{ i === 0 ? " · 封面" : "" }}</p>
          <p>
            <t-button size="small" variant="outline" :disabled="i === 0" @click="moveAsset(i, -1)">上移</t-button>
            <t-button size="small" variant="outline" @click="dropAsset(as.id)">拿掉</t-button>
          </p>
        </div>
      </div>
      <t-button theme="primary" style="margin-top: 16px" @click="save(); node = 'check'">去检查</t-button>
    </section>

    <section v-show="node === 'check' || node === 'copy'">
      <div class="check-item" v-for="(c, i) in report" :key="i">
        {{ c.level === "high" ? "高风险" : c.level === "warn" ? "注意" : "说明" }} · {{ c.text }}
      </div>
      <t-checkbox v-model="article.disclosureAck">我已在该站按平台规则做 AI 生成声明</t-checkbox>
      <t-checkbox v-if="highRisk" v-model="article.highRiskAck">已知晓仍复制</t-checkbox>
      <p style="margin-top: 16px">
        <t-button theme="primary" :disabled="!canCopyNow" @click="copyOpen">复制并打开后台</t-button>
        <t-button variant="outline" style="margin-left: 8px" :disabled="!canCopyNow" @click="copyText">复制正文</t-button>
      </p>
      <p class="err" v-if="copyErr">{{ copyErr }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { canGenerate } from "@yiyi/shared";
import { api } from "../api";

const steps = [
  { id: "topic", label: "选题" },
  { id: "media", label: "素材" },
  { id: "outline", label: "大纲" },
  { id: "body", label: "正文" },
  { id: "adapt", label: "适配" },
  { id: "check", label: "检查" },
  { id: "copy", label: "复制" },
];

type Opt = { code: string; labelZh: string };
type Article = {
  id: string;
  theme: string;
  formCode: string;
  intentCode: string;
  topicCodes: string[];
  anchors: { id: string; text: string; confirmed: boolean }[];
  outline: string;
  bodyLong: string;
  bodyNote: string;
  status: string;
  generateBlocked: string | null;
  disclosureAck: boolean;
  highRiskAck: boolean;
  checkReport: { level: string; text: string }[];
  assets: { id: string; kind: string; url: string; analysis?: { caption?: string } }[];
  layout?: { long?: { coverId?: string | null }; note?: { order?: string[] } };
};

const route = useRoute();
const router = useRouter();
const article = ref<Article | null>(null);
const options = ref<{ form: Opt[]; intent: Opt[]; topicL1: Opt[]; topicMore: Opt[] }>({
  form: [],
  intent: [],
  topicL1: [],
  topicMore: [],
});
const node = ref("topic");
const preview = ref<"desk" | "mp" | "note">("mp");
const copyErr = ref("");

const gateReason = computed(() => {
  const a = article.value;
  if (!a) return "";
  const local = canGenerate({
    anchors: a.anchors.map((x) => ({
      ...x,
      confirmed: x.confirmed || x.text.trim().length >= 4,
    })),
    quotaLeft: 99,
    subActive: true,
  });
  if (!local.ok) return local.reason ?? "";
  if (a.generateBlocked && /到期|篇数/.test(a.generateBlocked)) return a.generateBlocked;
  return "";
});

const report = computed(() => article.value?.checkReport ?? []);
const highRisk = computed(
  () => article.value?.intentCode === "intent.promo" || report.value.some((c) => c.level === "high"),
);
const canCopyNow = computed(() => {
  if (!article.value?.disclosureAck) return false;
  if (highRisk.value && !article.value.highRiskAck) return false;
  return true;
});
const noteHtml = computed(() => (article.value?.bodyNote || "").replace(/\n/g, "<br/>"));
const imageAssets = computed(() => {
  const all = (article.value?.assets || []).filter((a) => a.kind === "image");
  const order = article.value?.layout?.note?.order;
  if (!order?.length) return all;
  const byId = new Map(all.map((a) => [a.id, a]));
  return order.map((id) => byId.get(id)).filter((a): a is (typeof all)[number] => !!a);
});

onMounted(async () => {
  options.value = await api("/api/topic-options");
  if (!route.params.id) {
    const created = await api<{ id: string }>("/api/articles", { method: "POST", body: "{}" });
    await router.replace(`/write/${created.id}`);
  }
  await load();
});

watch(
  () => route.params.id,
  () => load(),
);

async function load() {
  if (!route.params.id) return;
  article.value = await api(`/api/articles/${route.params.id}`);
}

function toggleTopic(code: string) {
  if (!article.value) return;
  const cur = article.value.topicCodes || [];
  if (cur.includes(code)) article.value.topicCodes = cur.filter((c) => c !== code);
  else article.value.topicCodes = [...cur, code].slice(0, 2);
}

async function save() {
  if (!article.value) return;
  article.value = await api(`/api/articles/${article.value.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      theme: article.value.theme,
      formCode: article.value.formCode,
      intentCode: article.value.intentCode,
      topicCodes: article.value.topicCodes,
      anchors: article.value.anchors,
      outline: article.value.outline,
      bodyLong: article.value.bodyLong,
      bodyNote: article.value.bodyNote,
      layout: article.value.layout,
      currentNode: node.value,
      disclosureAck: article.value.disclosureAck,
      highRiskAck: article.value.highRiskAck,
    }),
  });
}

async function run() {
  await save();
  if (!article.value) return;
  article.value = await api(`/api/articles/${article.value.id}/generate`, { method: "POST" });
  node.value = "outline";
}

async function onFiles(ev: Event) {
  const files = (ev.target as HTMLInputElement).files;
  if (!files?.length || !article.value) return;
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  await fetch(`/api/articles/${article.value.id}/assets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("yiyi.token") || ""}` },
    body: fd,
  });
  await load();
}

async function confirmAsset(id: string) {
  if (!article.value) return;
  await api(`/api/articles/${article.value.id}/assets/${id}/confirm`, {
    method: "POST",
    body: JSON.stringify({ asAnchor: true }),
  });
  await load();
}

async function dropAsset(id: string) {
  if (!article.value) return;
  const order = imageAssets.value.map((a) => a.id).filter((x) => x !== id);
  article.value.layout = {
    ...(article.value.layout || {}),
    long: { coverId: order[0] ?? null },
    note: { order },
  };
  await save();
}

async function moveAsset(index: number, dir: number) {
  if (!article.value) return;
  const imgs = imageAssets.value;
  const next = index + dir;
  if (next < 0 || next >= imgs.length) return;
  const ids = imgs.map((a) => a.id);
  const t = ids[index];
  ids[index] = ids[next];
  ids[next] = t;
  await api(`/api/articles/${article.value.id}/assets/reorder`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
  await load();
}

async function copyOpen() {
  copyErr.value = "";
  try {
    await save();
    const pack = await api<{ longHtml: string; backends: { name: string; url: string }[] }>(
      `/api/articles/${article.value!.id}/copy-pack`,
    );
    await navigator.clipboard.writeText(pack.longHtml);
    window.open(pack.backends[0]?.url || "https://mp.weixin.qq.com/", "_blank");
  } catch (e) {
    copyErr.value = e instanceof Error ? e.message : "不能复制";
  }
}

async function copyText() {
  copyErr.value = "";
  try {
    await save();
    const pack = await api<{ longHtml: string }>(`/api/articles/${article.value!.id}/copy-pack`);
    await navigator.clipboard.writeText(pack.longHtml);
  } catch (e) {
    copyErr.value = e instanceof Error ? e.message : "不能复制";
  }
}
</script>
