import { http, HttpResponse, delay } from 'msw';

const booksByGenre = {
  'Ficción': [
    { id: 1, title: 'Cien años de soledad', author: 'Gabriel García Márquez', price: 15990 },
    { id: 2, title: 'La casa de los espíritus', author: 'Isabel Allende', price: 14990 },
    { id: 3, title: 'Pedro Páramo', author: 'Juan Rulfo', price: 10990 }
  ],
  'Ciencia Ficción': [
    { id: 4, title: 'Dune', author: 'Frank Herbert', price: 19990 },
    { id: 5, title: 'Fundación', author: 'Isaac Asimov', price: 13990 },
    { id: 6, title: 'Fahrenheit 451', author: 'Ray Bradbury', price: 11990 }
  ],
  'Misterio': [
    { id: 7, title: 'Diez negritos', author: 'Agatha Christie', price: 12990 },
    { id: 8, title: 'El nombre de la rosa', author: 'Umberto Eco', price: 16990 }
  ],
  'Drama': []
};

function respuestaSimulada(url) {
  const escenario = url.searchParams.get('simular');
  if (escenario === '500') {
    return HttpResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
  if (escenario === 'red') return HttpResponse.error();
  if (escenario === '404') {
    return HttpResponse.json({ message: 'Recurso no encontrado' }, { status: 404 });
  }
  return null;
}
// integracion MSW intercepta GET y endpoint REST
export const handlers = [
  http.get('/api/categories', async ({ request }) => {
    //retraso simula latencia 
    await delay(700);
    const error = respuestaSimulada(new URL(request.url));
    if (error) return error;
    //devuelve categorias genero
    return HttpResponse.json(Object.keys(booksByGenre).map((name) => ({ name })));
  }),
  http.get('/api/books', async ({ request }) => {
    await delay(1000);
    // carga
    const url = new URL(request.url);
    const error = respuestaSimulada(url);
    if (error) return error;
    const genre = url.searchParams.get('genre');
    //404 si no pilla nada
    if (!Object.prototype.hasOwnProperty.call(booksByGenre, genre)) {
      return HttpResponse.json({ message: 'Categoría no encontrada' }, { status: 404 });
    }
    //devuelve libros por genero
    return HttpResponse.json(booksByGenre[genre]);
  })
];
