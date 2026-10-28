// Push only: no caching of authenticated pages or financial data.
self.addEventListener("push", event => {
 let tag="dizi-reminder";try{const p=event.data.json();if(/^dizi-\d{4}-\d{2}-\d{2}$/.test(p.tag))tag=p.tag;}catch{}
 event.waitUntil(self.registration.showNotification("DIZI · Lembrete financeiro",{body:"Você tem pendências para conferir. Abra o DIZI para ver os detalhes.",icon:"/icons/dizi-192.png?v=2",badge:"/icons/dizi-192.png?v=2",tag}));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();event.waitUntil((async()=>{const url=new URL("/dashboard",self.location.origin).href;const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});for(const client of windows){if(new URL(client.url).origin===self.location.origin){await client.navigate(url);return client.focus();}}return self.clients.openWindow(url);})());
});
