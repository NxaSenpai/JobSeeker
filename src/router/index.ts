import { createRouter, createWebHistory } from "vue-router";

import AuthPage from "@/views/AuthPage.vue";
import LandingPage from "@/views/LandingPage.vue";

const routes = createRouter({
  history: createWebHistory(),
  routes: [

    {
        path: "/",
        name: "LandingPage",
        component: LandingPage,
    },
    {
        path: "/auth",
        name: "AuthPage",
        component: AuthPage,
    }

  ],
});

export default routes;