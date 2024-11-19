import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { MongoClient } from "https://deno.land/x/mongo/mod.ts";

// Conexión a la base de datos MongoDB
const client = new MongoClient();
await client.connect("mongodb://localhost:27017");
const db = client.database("santa");

// Definir colecciones
const childrenCollection = db.collection("children");
const locationsCollection = db.collection("locations");

// Crear esquemas (validaciones manuales)
interface Child {
  nombre: string;
  comportamiento: "bueno" | "malo";
  ubicacion: string;
}

interface Location {
  nombre: string;
  coordenadas: { lat: number; lon: number };
  numNiñosBuenos: number;
}

// Inicialización del servidor
const app = new Application();
const router = new Router();

// Middleware para manejo de errores y respuesta JSON
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.response.status = 500;
    ctx.response.body = { error: err.message };
  }
});

// Endpoints

// POST /ubicacion: Agregar lugar
router.post("/ubicacion", async (ctx) => {
  const { nombre, coordenadas } = await ctx.request.body().value;

  if (!nombre || !coordenadas || !coordenadas.lat || !coordenadas.lon) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Todos los campos son obligatorios." };
    return;
  }

  const exists = await locationsCollection.findOne({ nombre });
  if (exists) {
    ctx.response.status = 400;
    ctx.response.body = { error: "El nombre del lugar ya existe." };
    return;
  }

  await locationsCollection.insertOne({ nombre, coordenadas, numNiñosBuenos: 0 });
  ctx.response.status = 201;
  ctx.response.body = { message: "Lugar agregado exitosamente." };
});

// POST /ninos: Agregar un nuevo niño
router.post("/ninos", async (ctx) => {
  const { nombre, comportamiento, ubicacion } = await ctx.request.body().value;

  if (!nombre || !comportamiento || !ubicacion) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Todos los campos son obligatorios." };
    return;
  }

  if (!["bueno", "malo"].includes(comportamiento)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "El comportamiento debe ser 'bueno' o 'malo'." };
    return;
  }

  const location = await locationsCollection.findOne({ nombre: ubicacion });
  if (!location) {
    ctx.response.status = 400;
    ctx.response.body = { error: "La ubicación especificada no existe." };
    return;
  }

  const exists = await childrenCollection.findOne({ nombre });
  if (exists) {
    ctx.response.status = 400;
    ctx.response.body = { error: "El nombre del niño ya existe." };
    return;
  }

  await childrenCollection.insertOne({ nombre, comportamiento, ubicacion });

  if (comportamiento === "bueno") {
    await locationsCollection.updateOne(
      { nombre: ubicacion },
      { $inc: { numNiñosBuenos: 1 } }
    );
  }

  ctx.response.status = 201;
  ctx.response.body = { message: "Niño agregado exitosamente." };
});

// GET /ninos/buenos: Listar niños buenos
router.get("/ninos/buenos", async (ctx) => {
  const buenos = await childrenCollection.find({ comportamiento: "bueno" }).toArray();
  ctx.response.body = buenos;
});

// GET /ninos/malos: Listar niños malos
router.get("/ninos/malos", async (ctx) => {
  const malos = await childrenCollection.find({ comportamiento: "malo" }).toArray();
  ctx.response.body = malos;
});

// GET /entregas: Ordenar ubicaciones por niños buenos
router.get("/entregas", async (ctx) => {
  const locations = await locationsCollection
    .find()
    .sort({ numNiñosBuenos: -1 })
    .toArray();

  ctx.response.body = locations;
});

// GET /ruta: Calcular distancia total a recorrer
router.get("/ruta", async (ctx) => {
  const locations = await locationsCollection
    .find()
    .sort({ numNiñosBuenos: -1 })
    .toArray();

  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  let totalDistance = 0;
  for (let i = 0; i < locations.length - 1; i++) {
    const current = locations[i].coordenadas;
    const next = locations[i + 1].coordenadas;
    totalDistance += haversine(current.lat, current.lon, next.lat, next.lon);
  }

  ctx.response.body = { totalDistance };
});

// Asociar rutas y ejecutar servidor
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Servidor escuchando en http://localhost:6768");
await app.listen({ port: 6768 });
