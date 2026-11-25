import {notificationHandler} from './handler.mjs';
Deno.serve(notificationHandler(name=>Deno.env.get(name)));
