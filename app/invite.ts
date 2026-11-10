export function invitationToken(value:string){
 const input=value.trim();let token=input;
 if(/^https?:\/\//i.test(input)){try{token=new URL(input).searchParams.get('invite')||'';}catch{throw new Error('Paste a valid invitation link or code.');}}
 if(!/^[A-Za-z0-9_-]{32,100}$/.test(token))throw new Error('Paste a valid invitation link or code.');
 return token;
}
