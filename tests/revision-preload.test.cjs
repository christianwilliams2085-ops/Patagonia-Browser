const test=require('node:test');const assert=require('node:assert/strict');
const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const {EventEmitter}=require('node:events');
test('las suscripciones se cancelan y nunca devuelven IPC ni sus eventos privilegiados',()=>{
 const ipc=new EventEmitter();let api;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../preload.js'),'utf8'),{
  require:()=>({ipcRenderer:ipc,contextBridge:{exposeInMainWorld:(_nombre,valor)=>{api=valor;}}})
 });
 const metodos={recibirBusqueda:'estado-busqueda',recibirEnfoqueDireccion:'enfocar-direccion',recibirProteccion:'proteccion-actualizada',recibirSesion:'sesion-actualizada',recibirDescargas:'descargas-actualizadas',recibirHistorial:'historial-actualizado',recibirURL:'url-actualizada',recibirPestanas:'pestanas-actualizadas',recibirEstadoBarraLateral:'estado-barra-lateral'};
 for(const [metodo,canal]of Object.entries(metodos)){
  let recibidos;
  const cancelar=api[metodo]((...datos)=>{recibidos=datos;});
  assert.equal(typeof cancelar,'function');
  ipc.emit(canal,{sender:'privilegiado'},'dato');
  assert.deepEqual(recibidos,['dato']);cancelar();cancelar();
  assert.equal(ipc.listenerCount(canal),0);
 }
});
