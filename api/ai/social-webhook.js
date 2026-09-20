import {backendProxy} from '../_lib/backend-proxy.js';
export const config={api:{bodyParser:false}};
export default backendProxy('/api/webhooks/meta');
