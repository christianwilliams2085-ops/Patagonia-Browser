const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {cerrarContenido,registrarCierre}=require('../src/main/lifecycle');
function entorno(sinGuardar=true){
 const contenido=new EventEmitter(),ventana=new EventEmitter(),llamadas=[];
 let destruido=false;
 contenido.isDestroyed=()=>destruido;
 contenido.getURL=()=> 'https://formulario.example/';
 contenido.mainFrame={};ventana.isDestroyed=()=>false;
 contenido.close=opciones=>{
  llamadas.push(opciones);
  if(sinGuardar&&opciones.waitForBeforeUnload)contenido.emit('will-prevent-unload',{});
  else{destruido=true;contenido.emit('destroyed');}
 };
 return{contenido,ventana,llamadas};
}
test('un contenido que ya fue liberado se considera cerrado',async()=>{
 for(const contenido of [undefined,null,{isDestroyed:()=>true}]){
  assert.equal(await cerrarContenido({contenido}),true);
 }
});
test('una página sin cambios se cierra sin diálogo',async()=>{
 const p=entorno(false);
 assert.equal(await cerrarContenido({...p,dialog:{showMessageBox(){assert.fail();}}}),true);
 assert.deepEqual(p.llamadas,[{waitForBeforeUnload:true}]);
});
test('cancelar conserva el documento con cambios y limpia listeners',async()=>{
 const p=entorno();
 assert.equal(await cerrarContenido({...p,dialog:{showMessageBox:async()=>({response:0})}}),false);
 assert.equal(p.contenido.isDestroyed(),false);
 assert.equal(p.contenido.listenerCount('will-prevent-unload'),0);
 assert.equal(p.ventana.listenerCount('closed'),0);
});
test('descartar sólo fuerza el cierre después de la confirmación explícita',async()=>{
 const p=entorno();let resolver;
 const resultado=cerrarContenido({...p,dialog:{showMessageBox:()=>new Promise(r=>resolver=r)}});
 await Promise.resolve();
 assert.equal(p.contenido.isDestroyed(),false);
 resolver({response:1});
 assert.equal(await resultado,true);
 assert.deepEqual(p.llamadas,[{waitForBeforeUnload:true},{waitForBeforeUnload:false}]);
});
test('repetir cerrar mientras se confirma no duplica el diálogo',async()=>{
 const p=entorno();let resolver,veces=0;
 const opciones={...p,dialog:{showMessageBox:()=>{veces++;return new Promise(r=>resolver=r);}}};
 const a=cerrarContenido(opciones),b=cerrarContenido(opciones);
 await Promise.resolve();resolver({response:0});
 assert.equal(a,b);await a;assert.equal(veces,1);
});
test('una respuesta antigua nunca cierra el nuevo documento de una pestaña',async()=>{
 const p=entorno();let resolver;
 const resultado=cerrarContenido({...p,dialog:{showMessageBox:()=>new Promise(r=>resolver=r)}});
 await Promise.resolve();
 p.contenido.emit('did-start-navigation',{},'https://otro.example/',false,true);
 resolver({response:1});
 assert.equal(await resultado,false);
 await Promise.resolve();
 assert.equal(p.contenido.isDestroyed(),false);
});
test('cancelar un cierre de página también cancela el cierre de la ventana',async()=>{
 const ventana=new EventEmitter();ventana.isDestroyed=()=>false;
 let resolver,guardadas=false,cierres=0;
 ventana.close=()=>{cierres++;};
 registrarCierre({ventana,dialog:{},contarDescargas:()=>0,
 guardarDatos:async()=>{guardadas=true;},cerrarPestanas:()=>new Promise(r=>resolver=r)});
 ventana.emit('close',{preventDefault(){}});
 for(let i=0;i<5&&!resolver;i++)await new Promise(r=>setImmediate(r));
 assert.equal(guardadas,true);resolver(false);
 await new Promise(r=>setImmediate(r));
 assert.equal(cierres,0);
});
