import React, { useEffect, useState } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, NavLink, Link, useParams, useSearchParams } from 'react-router-dom';

const cache = new Map();
const pendientes = new Map();

function consultar(url) {
  //reutiliza datos evitando conultas repetidas ni repetir peticiones en curso
  if (cache.has(url)) return Promise.resolve(cache.get(url));
  if (pendientes.has(url)) return pendientes.get(url);
  const solicitud = fetch(url).then(async (respuesta) => {
    if (!respuesta.ok) {
      if (respuesta.status === 404) throw new Error('404, no encontramos el recurso solicitado');
      if (respuesta.status >= 500) throw new Error(`${respuesta.status}, el servidor no pudo responder correctamente`);
      throw new Error(`Error HTTP ${respuesta.status}`);
    }
    const datos = await respuesta.json();
    if (!Array.isArray(datos)) throw new Error('La respuesta de la API no tiene el formato esperado');
    // almacena los datos para consultas
    cache.set(url, datos);
    return datos;
  }).catch((error) => {
    if (error instanceof TypeError) throw new Error('No se pudo conectar con la API, revisa la conexión');
    throw error;
  }).finally(() => pendientes.delete(url));
  pendientes.set(url, solicitud);
  return solicitud;
}

function useConsulta(url) {
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState({ url: '', intento: -1, datos: [], error: '', loading: true });

  useEffect(() => {
    let vigente = true;
    if (cache.has(url)) {
      setEstado({ url, intento, datos: cache.get(url), error: '', loading: false });
    } else {
      setEstado({ url, intento, datos: [], error: '', loading: true });
      consultar(url).then((datos) => {
        if (vigente) setEstado({ url, intento, datos, error: '', loading: false });
      }).catch((error) => {
        if (vigente) setEstado({ url, intento, datos: [], error: error.message, loading: false });
      });
    }
    return () => { vigente = false; };
    // ejecuta consulta cuando cambia url o soliticto reintento
  }, [url, intento]);

  function reintentar() {
    cache.delete(url);
    setIntento((anterior) => anterior + 1);
  }

  const actual = estado.url === url && estado.intento === intento
    ? estado
    : { datos: cache.get(url) || [], error: '', loading: !cache.has(url) };
  return { ...actual, reintentar };
}

function EstadoPeticion({ consulta, nombre, recuperar }) {
  if (consulta.loading) return <div className="estado" role="status"><span className="spinner" /> Cargando {nombre}...</div>;
  if (consulta.error) return <div className="estado error" role="alert">
    <strong>{consulta.error}</strong>
    <p>Puedes reintentar la solicitud o volver al catálogo.</p>
    <div className="acciones"><button onClick={recuperar || consulta.reintentar}>Reintentar</button><Link to="/">Volver al inicio</Link></div>
  </div>;
  return null;
}

function Menu({ categorias }) {
  return <nav aria-label="Categorías de libros" className="menu">
    <NavLink to="/" end>Inicio</NavLink>
    {categorias.map(({ name }) => <NavLink key={name} to={`/genre/${encodeURIComponent(name)}`}>{name}</NavLink>)}
  </nav>;
}

function Home({ categorias }) {
  return <>
    <div className="portada"><p className="etiqueta">Tienda de libros</p><h1>Encuentra tu próxima lectura</h1><p>Explora las categorías disponibles en nuestro catálogo.</p></div>
    <h2>Categorías</h2>
    <div className="grilla">{categorias.map(({ name }, i) => <Link className="categoria" key={name} to={`/genre/${encodeURIComponent(name)}`}><span className="numero">0{i + 1}</span><h3>{name}</h3><span>Explorar libros →</span></Link>)}</div>
    {!categorias.length && <p>No hay categorías disponibles.</p>}
  </>;
}

function BookList() {
  const { genre } = useParams();
  const [params, setParams] = useSearchParams();
  const simulacion = params.get('simular');
  const url = `/api/books?genre=${encodeURIComponent(genre)}${simulacion ? `&simular=${encodeURIComponent(simulacion)}` : ''}`;
  const consulta = useConsulta(url);
  function recuperar() {
    if (simulacion) {
      cache.delete(`/api/books?genre=${encodeURIComponent(genre)}`);
      setParams({});
    } else consulta.reintentar();
  }

  return <>
    <Link className="volver" to="/">← Todas las categorías</Link>
    <h1>{genre}</h1><p className="subtitulo">Libros disponibles en esta categoría</p>
    <EstadoPeticion consulta={consulta} nombre="libros" recuperar={recuperar} />
    {!consulta.loading && !consulta.error && <>
      {consulta.datos.length === 0 ? <div className="estado"><strong>No hay libros disponibles</strong><p>Explora otra categoría del catálogo.</p><Link to="/">Ver categorías</Link></div> : <div className="grilla libros">
        {consulta.datos.map((book, i) => <article className="libro" key={book.id}>
          <div className={`lomo lomo-${i % 3}`}><span>{genre}</span><h2>{book.title}</h2><p>{book.author}</p></div>
          <div className="detalle"><h3>{book.title}</h3><p>{book.author}</p><strong>{book.price.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</strong></div>
        </article>)}
      </div>}
    </>}
    <details className="pruebas"><summary>Pruebas de integración REST</summary><p>Estas opciones generan errores simulados mediante solicitudes HTTP reales interceptadas por MSW.</p><div className="acciones">
      <button onClick={() => setParams({ simular: '404' })} disabled={consulta.loading}>Simular 404</button>
      <button onClick={() => setParams({ simular: '500' })} disabled={consulta.loading}>Simular 500</button>
      <button onClick={() => setParams({ simular: 'red' })} disabled={consulta.loading}>Simular red</button>
      <button onClick={() => setParams({})} disabled={!simulacion}>Restaurar consulta</button>
    </div></details>
  </>;
}

function Tienda() {
  const [params, setParams] = useSearchParams();
  const escenario = params.get('categorias');
  const consulta = useConsulta(`/api/categories${escenario ? `?simular=${encodeURIComponent(escenario)}` : ''}`);
  return <div className="app">
    <header><div className="contenedor cabecera"><Link className="marca" to="/">página <span>libre</span></Link><span className="cabecera-texto">librería digital</span></div><div className="contenedor"><Menu categorias={consulta.datos} /></div></header>
    <main className="contenedor contenido">
      <EstadoPeticion consulta={consulta} nombre="categorías" recuperar={escenario ? () => { cache.delete('/api/categories'); setParams({}); } : undefined} />
      <Routes>
        <Route path="/" element={!consulta.loading && !consulta.error ? <Home categorias={consulta.datos} /> : null} />
        <Route path="/genre/:genre" element={<BookList />} />
        <Route path="*" element={<div className="estado"><h1>Página no encontrada</h1><Link to="/">Volver al catálogo</Link></div>} />
      </Routes>
      <details className="pruebas"><summary>Pruebas de carga de categorías</summary><div className="acciones">
        <Link to="/?categorias=500">Simular error de categorías</Link>
      </div></details>
    </main>
    <footer><div className="contenedor pie"><span>página libre · catálogo de ejemplo</span><span>frontend ii · semana 4</span></div></footer>
  </div>;
}

export default function App() {
  const Router = process.env.NODE_ENV === 'production' ? HashRouter : BrowserRouter;
  return <Router><Tienda /></Router>;
}
