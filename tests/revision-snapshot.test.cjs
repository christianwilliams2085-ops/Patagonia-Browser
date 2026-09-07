const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {obtenerHTMLPagina}=require('../src/main/pageSnapshot');
const {JSDOM}=require('jsdom');
function pagina(ejecutar){
 const contenido=new EventEmitter();
 contenido.isDestroyed=()=>false;contenido.getURL=()=> 'https://example.com/';
 contenido.mainFrame={isDestroyed:()=>false,url:contenido.getURL(),executeJavaScript:ejecutar};
 contenido.executeJavaScript=()=>assert.fail('no esperar a did-stop-loading');
 return contenido;
}
test('extrae HTML sin scripts y sin esperar el fin de carga de la red',async()=>{
 const dom=new JSDOM('<title>Prueba</title><h1>Texto útil</h1><script>secreto()</script><style>body{}</style><iframe></iframe>',{url:'https://example.com/',runScripts:'outside-only'});
 try{
  const c=pagina(async codigo=>dom.window.eval(codigo));
  const datos=await obtenerHTMLPagina(c);
  assert.equal(datos.titulo,'Prueba');assert.match(datos.html,/Texto útil/);
  assert.doesNotMatch(datos.html,/<script|<style|<iframe/);
  assert.equal(c.listenerCount('did-start-navigation'),0);
 }finally{dom.window.close();}
});
test('un renderer que no responde tiene un límite y no deja listeners',async()=>{
 const c=pagina(()=>new Promise(()=>{}));
 await assert.rejects(obtenerHTMLPagina(c,{tiempoLimite:10}),/no respondió a tiempo/);
 assert.equal(c.listenerCount('did-start-navigation'),0);assert.equal(c.listenerCount('destroyed'),0);
});
test('navegar o cerrar cancela la lectura pendiente y absorbe rechazos tardíos',async()=>{
 for(const evento of ['did-start-navigation','destroyed','render-process-gone']){
  let rechazar;
  const c=pagina(()=>new Promise((_,r)=>rechazar=r));
  const pendiente=obtenerHTMLPagina(c);await Promise.resolve();
  c.emit(evento,{},'https://otro.example/',false,true);
  await assert.rejects(pendiente);
  rechazar(new Error('documento desapareció'));await new Promise(r=>setImmediate(r));
  assert.equal(c.listenerCount('did-start-navigation'),0);
 }
});
test('rechaza páginas internas y respuestas excesivas o de otro documento',async()=>{
 const c=pagina(async()=>({url:'https://example.com/',titulo:'x',html:'a'.repeat(2000001)}));
 await assert.rejects(obtenerHTMLPagina(c),/contenido de página válido/);
 c.getURL=()=> 'file:///interfaz.html';await assert.rejects(obtenerHTMLPagina(c),/página web/);
});
