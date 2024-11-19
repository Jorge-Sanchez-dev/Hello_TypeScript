import { MongoClient, ObjectId } from "mongodb";
import type { NinoModel, LugarModel } from "./types.ts";


const MONGO_URL = Deno.env.get("MONGO_URL");
if (!MONGO_URL) {
  console.error("MONGO_URL is not set");
  Deno.exit(1);
}

const client = new MongoClient(MONGO_URL);
await client.connect();
console.info("Connected to MongoDB");

const db = client.db("Nebrija");
const ubicacionesCollection = db.collection<LugarModel>("ubicaciones");
const ninosCollection = db.collection<NinoModel>("ninos");

// Haversine Function
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radio de la Tierra en km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const handler = async (req: Request): Promise<Response> => {
  const method = req.method;
  const url = new URL(req.url);
  const path = url.pathname;

  if (method === "GET") {
    if (path === "/ninos/buenos") {
      const buenos = await ninosCollection.find({ comportamiento: "bueno" }).toArray();
      return new Response(JSON.stringify(buenos));
    } else if (path === "/ninos/malos") {
      const malos = await ninosCollection.find({ comportamiento: "malo" }).toArray();
      return new Response(JSON.stringify(malos));
    } else if (path === "/entregas") {
      const ubicaciones = await ubicacionesCollection
        .find()
        .sort({ ninosBuenos: -1 })
        .toArray();
      return new Response(JSON.stringify(ubicaciones));
    } else if (path === "/ruta") {
      const ubicaciones = await ubicacionesCollection
        .find()
        .sort({ ninosBuenos: -1 })
        .toArray();

      let distanciaTotal = 0;
      for (let i = 0; i < ubicaciones.length - 1; i++) {
        const [lat1, lon1] = ubicaciones[i].coordenadas.split(",").map(Number);
        const [lat2, lon2] = ubicaciones[i + 1].coordenadas.split(",").map(Number);
        distanciaTotal += haversine(lat1, lon1, lat2, lon2);
      }

      return new Response(JSON.stringify({ distanciaTotal }));
    }
  } else if (method === "POST") {
    if (path === "/ubicacion") {
      const ubicacion = await req.json();
      if (!ubicacion.nombre || !validarCoordenadas(ubicacion.coordenadas)) {
        return new Response("Bad request", { status: 400 });
      }

      const ubicacionExistente = await ubicacionesCollection.findOne({
        nombre: ubicacion.nombre,
      });
      if (ubicacionExistente) {
        return new Response("Ubicación ya existe", { status: 409 });
      }

      await ubicacionesCollection.insertOne({
        nombre: ubicacion.nombre,
        coordenadas: ubicacion.coordenadas,
        ninosBuenos: 0,
      });

      return new Response("Ubicación creada", { status: 201 });
    } else if (path === "/ninos") {
      const nino = await req.json();
      if (!nino.nombre || !["bueno", "malo"].includes(nino.comportamiento) || !nino.ubicacion) {
        return new Response("Bad request", { status: 400 });
      }

      const ubicacion = await ubicacionesCollection.findOne({ _id: new ObjectId(nino.ubicacion) });
      if (!ubicacion) {
        return new Response("Ubicación no encontrada", { status: 404 });
      }

      const ninoExistente = await ninosCollection.findOne({ nombre: nino.nombre });
      if (ninoExistente) {
        return new Response("Niño ya existe", { status: 409 });
      }

      await ninosCollection.insertOne(nino);
      if (nino.comportamiento === "bueno") {
        await ubicacionesCollection.updateOne(
          { _id: new ObjectId(nino.ubicacion) },
          { $inc: { ninosBuenos: 1 } }
        );
      }

      return new Response("Niño agregado", { status: 201 });
    }
  }

  return new Response("Endpoint not found", { status: 404 });
};

Deno.serve({ port: 6768 }, handler);