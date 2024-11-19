import { MongoClient, ObjectId } from "mongodb";
import type { NinoModel, LugarModel } from "./types.ts";
import { fromModelToNino, fromModelToLugar } from "./utils.ts";

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

// Haversine Funcion
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
      const response = await Promise.all(buenos.map(fromModelToNino));
      return new Response(JSON.stringify(response));
    } else if (path === "/ninos/malos") {
      const malos = await ninosCollection.find({ comportamiento: "malo" }).toArray();
      const response = await Promise.all(malos.map(fromModelToNino));
      return new Response(JSON.stringify(response));
    } else if (path === "/entregas") {
      const ubicaciones = await ubicacionesCollection
        .find()
        .sort({ numNinosBuenos: -1 })
        .toArray();
      const response = ubicaciones.map(fromModelToLugar);
      return new Response(JSON.stringify(response));
    } else if (path === "/ruta") {
      const ubicaciones = await ubicacionesCollection
        .find()
        .sort({ numNinosBuenos: -1 })
        .toArray();
  
      let distanciaTotal = 0;
      
      const distancias = [];
    
      for (let i = 0; i < ubicaciones.length - 1; i++) {
        const { lat: lat1, log: lon1 } = ubicaciones[i].coordenadas;
        const { lat: lat2, log: lon2 } = ubicaciones[i + 1].coordenadas;
    
        const distancia = haversine(lat1, lon1, lat2, lon2);

        distanciaTotal += distancia;
    
        distancias.push({
          desde: ubicaciones[i].nombre,
          hasta: ubicaciones[i + 1].nombre,
          distancia: distancia, 
        });
      }
    
      const resultado = {
        distancias,
        distanciaTotal,
      };
    
      return new Response(JSON.stringify(resultado));
    }
    
  } else if (method === "POST") {
    if (path === "/ubicacion") {
      const ubicacion = await req.json();
      if (!ubicacion.nombre || !ubicacion.coordenadas) {
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
        numNinosBuenos: 0,
      });

      return new Response("Ubicación creada", { status: 201 });

    /* Se prueba en POSTMAN asi:
    {
      "nombre": "Parque Central",
      "coordenadas": { "lat": 401123,"log": -74123},
      "numNinosBuenos": 0
    }
    */
    } else if (path === "/ninos") {
      const nino = await req.json();
      
      if (!nino.nombre || !nino.comportamiento || !nino.ubicacion) {
        return new Response("Bad request", { status: 400 });
      }
    
      if (!['bueno', 'malo'].includes(nino.comportamiento)) {
        return new Response("Comportamiento inválido", { status: 400 });
      }
    
      const ninoExistente = await ninosCollection.findOne({ nombre: nino.nombre });
      if (ninoExistente) {
        return new Response("El nombre del niño ya existe", { status: 409 });
      }
    
      const nuevoNino: NinoModel = {
        nombre: nino.nombre,
        comportamiento: nino.comportamiento,
        ubicacion: new ObjectId(nino.ubicacion),
      };
      
      await ninosCollection.insertOne(nuevoNino);
    
      if (nino.comportamiento === 'bueno') {
        await ubicacionesCollection.updateOne(
          { _id: new ObjectId(nino.ubicacion) },
          { $inc: { numNinosBuenos: 1 } }
        );
      }
    
      return new Response("Niño creado", { status: 201 });
    }
    
  }
  /* Se prueba en POSTMAN asi:
    {
    "nombre": "Nombre",
    "comportamiento": "bueno",
    "ubicacion": "identidicador"
    }
  */

  return new Response("Endpoint not found", { status: 404 });
};

Deno.serve({ port: 6768 }, handler);