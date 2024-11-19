import type { Collection } from "mongodb";
import type { NinoModel, Nino, LugarModel, Lugar } from "./types.ts";


export const fromModelToNino = async (
  ninoDB: NinoModel,
): Promise<Nino> => {
  return {
    id: ninoDB._id!.toString(),
    nombre: ninoDB.nombre,
    comportamiento: ninoDB.comportamiento,
    ubicacion: ninoDB.ubicacion,
  };
};

export const fromModelToLugar = (model: LugarModel): Lugar => ({
  id: model._id!.toString(),
  nombre: model.nombre,
  coordenadas: model.coordenadas,
  numNinosBuenos: model.numNinosBuenos
});