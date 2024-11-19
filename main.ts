
import { MongoClient } from "mongodb";

// Conexión a la base de datos MongoDB
const MONGO_URL = Deno.env.get("MONGO_URL");
if (!MONGO_URL) {
  console.error("MONGO_URL is not set");
  Deno.exit(1);
}

const client = new MongoClient(MONGO_URL);
await client.connect();
console.info("Connected to MongoDB");

const db = client.db("agenda");

const handler = async (req: Request): Promise<Response> => {
  const method = req.method;
  const url = new URL(req.url);
  const path = url.pathname;

  if (method === "GET") { //leer datos
  } else if (method === "POST") { // aniadir datos
  } else if (method === "PUT") { // actualizar datos
  } else if (method === "DELETE") {//Eliminar datos
  }

  return new Response("endpoint not found", { status: 404 });
};

Deno.serve({ port: 3000 }, handler);