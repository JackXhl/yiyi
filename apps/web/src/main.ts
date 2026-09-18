import { createApp } from "vue";
import { createPinia } from "pinia";
import TDesign from "tdesign-vue-next";
import "tdesign-vue-next/es/style/index.css";
import App from "./App.vue";
import router from "./router";
import { useAuth } from "./stores/auth";
import "./styles.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(TDesign);
useAuth().hydrate();
app.mount("#app");
