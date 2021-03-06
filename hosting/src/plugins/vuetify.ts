import Vue from 'vue';
import Vuetify from 'vuetify/lib';

Vue.use(Vuetify);

// dark theme
const mql = matchMedia('(prefers-color-scheme: dark)');

const vuetify = new Vuetify({
  theme: { dark: mql.matches },
  icons: { iconfont: 'mdiSvg' },
});

if (typeof mql.addEventListener === 'function') {
  mql.addEventListener('change', (e) => { vuetify.framework.theme.dark = e.matches; });
}

export default vuetify;
