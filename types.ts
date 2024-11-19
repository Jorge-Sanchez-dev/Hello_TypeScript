import { ObjectId, type OptionalId} from "mongodb";

export type Comportamiento = 'bueno' | 'malo';

export type Coordenadas = {lat: number; log: number};

//Ninyo
export type NinoModel = OptionalId<{
  name: string; 
  comportamiento: Comportamiento;
  ubicacion: ObjectId;
}>;

//Lugar
export type LugarModel = OptionalId<{
  nombre: string; 
  coordenadas: Coordenadas;
  numNinosBuenos: number;
}>;

export type Nino = {
  id: string;
  name: string; 
  comportamiento: Comportamiento;
  ubicacion: ObjectId;
}

export type Lugar = {
  id: string;
  nombre: string; 
  coordenadas: Coordenadas;
  numNinosBuenos: number;
}