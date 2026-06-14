import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('page.tsx'),
  route('/templates', 'templates/page.tsx'),
  route('/designer', 'designer/page.tsx'),
  route('/ai', 'ai/page.tsx'),
  route('/analyze', 'analyze/page.tsx'),
  route('/library', 'library/page.tsx'),
] satisfies RouteConfig;
