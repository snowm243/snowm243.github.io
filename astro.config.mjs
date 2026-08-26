// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // 如果部署为 <username>.github.io（根域名），site 填你的用户名即可，无需 base
  // 如果部署为项目页（比如 <username>.github.io/tool-hub），需要额外设置：
  //   base: '/tool-hub'
  site: 'https://snowm243.github.io',
});
