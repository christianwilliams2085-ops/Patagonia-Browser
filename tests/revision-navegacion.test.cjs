const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {prepararDireccion}=require('../src/main/navigation');
const {crearPestanasCerradas}=require('../src/main/closedTabs');
const {registrarErroresCarga}=require('../src/main/loadErrors');

test('las acciones de navegación ignoran pestañas sin contenido o ya destruidas',()=>{
    const {obtenerContenido,navegar,atras,adelante,recargar,detener,estadoNavegacion}=require('../src/main/navigation');
    for(const pestana of [undefined,{}, {vista:{}}, {vista:{webContents:{isDestroyed:()=>true}}}]){
        assert.equal(obtenerContenido(pestana),null);
        for(const accion of [navegar,atras,adelante,recargar]) assert.doesNotThrow(()=>accion(pestana));
        assert.equal(detener(pestana),false);
        assert.deepEqual(estadoNavegacion(pestana),{puedeRetroceder:false,puedeAvanzar:false});
    }
});

test('reabre una pestaña about:blank sin transformarla en búsqueda',()=>{
    const cerradas=crearPestanasCerradas();
    cerradas.guardar({url:'about:blank'});
    assert.equal(prepararDireccion(cerradas.recuperar().url),'about:blank');
});

test('una navegación cancelada restaura la dirección del documento visible',()=>{
    const contenido=new EventEmitter();
    contenido.getURL=()=> 'https://anterior.example/';
    contenido.isDestroyed=()=>false;
    const pestana={url:contenido.getURL(),vista:{webContents:contenido,setVisible(){}}};
    registrarErroresCarga(pestana,()=>{});
    contenido.emit('did-start-navigation',{},'https://destino.example/',false,true);
    contenido.emit('did-fail-load',{},-3,'ERR_ABORTED','https://destino.example/',true);
    assert.equal(pestana.url,contenido.getURL());
    assert.equal(pestana.errorCarga,null);
});

test('una cancelación anterior no cambia una navegación más reciente',()=>{
    const contenido=new EventEmitter();
    contenido.getURL=()=> 'https://anterior.example/';contenido.isDestroyed=()=>false;
    const pestana={url:contenido.getURL(),vista:{webContents:contenido,setVisible(){}}};
    registrarErroresCarga(pestana,()=>{});
    contenido.emit('did-start-navigation',{},'https://destino.example/',false,true);
    contenido.emit('did-start-navigation',{},'https://nuevo.example/',false,true);
    contenido.emit('did-fail-load',{},-3,'ERR_ABORTED','https://destino.example/',true);
    assert.equal(pestana.url,'https://nuevo.example/');
});
