import { createApp } from 'vue'
import App from './App.vue'
import i18n from './locales/i18n'
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap/dist/js/bootstrap.bundle.min.js"
import "bootstrap-icons/font/bootstrap-icons.css"
import "@fortawesome/fontawesome-free/css/all.min.css"
import "./assets/css/_variables.css"
import "./assets/css/layout.css"
import "./assets/css/common.css"
import store from "./store"
import { router } from './router'
import Keycloak from "keycloak-js"
import orthancApi from './orthancApi'
import axios from 'axios'


// before initialization, we must load part of the configuration to know if we need to enable Keycloak or not
axios.get('../api/pre-login-configuration').then((config) => {

  const app = createApp(App)

  app.use(router)
  app.use(store)
  app.use(i18n)

  let keycloackConfig = null;

  if (config.data['Keycloak'] && config.data['Keycloak'] != null && config.data['Keycloak']['Enable']) {
    console.log("Keycloak is enabled");

    keycloackConfig = config.data['Keycloak']

    let initOptions = {
      url: keycloackConfig['Url'], 
      realm: keycloackConfig['Realm'], 
      clientId: keycloackConfig['ClientId'], 
      onLoad: 'login-required'
    }

    window.keycloak = new Keycloak(initOptions);

    window.keycloak.init({ onLoad: initOptions.onLoad }).then(async (auth) => {

      if (!auth) {
        window.location.reload();
      } else {
        console.log("Authenticated");
      }

      localStorage.setItem("vue-token", window.keycloak.token);
      localStorage.setItem("vue-refresh-token", window.keycloak.refreshToken);
      orthancApi.updateAuthHeader();

      app.mount('#app');
      await router.push('/');

      setInterval(() => {
        window.keycloak.updateToken(70).then((refreshed) => {
          if (refreshed) {
            console.log('Token refreshed' + refreshed);
            orthancApi.updateAuthHeader();
          } else {
            console.log('Token not refreshed, valid for '
              + Math.round(window.keycloak.tokenParsed.exp + window.keycloak.timeSkew - new Date().getTime() / 1000) + ' seconds');
          }
        }).catch(() => {
          console.log('Failed to refresh token');
        });

      }, 60000)

    }).catch(() => {
      console.log("Authenticated Failed");
    });
  } else {
    app.mount('#app')
  }
});
