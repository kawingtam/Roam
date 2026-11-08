import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const u=await getChatGPTUser();if(!u)return new Response('Sign in required',{status:401});
 const id=new URL(req.url).searchParams.get('id');const e=await env.DB!.prepare('SELECT receipt FROM expenses WHERE id=? AND user=?').bind(id,u.userId).first();if(!e?.receipt)return new Response('Not found',{status:404});
 const file=await env.BUCKET!.get(e.receipt as string);if(!file)return new Response('Not found',{status:404});
 return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
export async function POST(req:Request){
 const u=await getChatGPTUser();if(!u)return new Response('Sign in required',{status:401});
 if(req.headers.get('origin')!==new URL(req.url).origin)return new Response('Invalid origin',{status:403});
 const id=new URL(req.url).searchParams.get('id');const e=await env.DB!.prepare('SELECT id FROM expenses WHERE id=? AND user=?').bind(id,u.userId).first();if(!e)return new Response('Not found',{status:404});
 if(Number(req.headers.get('content-length'))>8*1024*1024)return new Response('Receipt too large',{status:413});
 const reader=req.body?.getReader();if(!reader)return new Response('Missing receipt',{status:400});const chunks:Uint8Array[]=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>8*1024*1024){await reader.cancel();return new Response('Receipt too large',{status:413});}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
 if(!jpeg&&!png)return new Response('Use JPEG or PNG',{status:400});
 const key=u.userId+'/'+id;await env.BUCKET!.put(key,bytes,{httpMetadata:{contentType:jpeg?'image/jpeg':'image/png'}});
 await env.DB!.prepare('UPDATE expenses SET receipt=? WHERE id=? AND user=?').bind(key,id,u.userId).run();return Response.json({ok:true});
}
