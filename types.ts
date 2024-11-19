import { ObjectId, type OptionalId} from "mongodb";

export type Comportamiento = 'bueno' | 'malo';

//Ninyo
export type NinyoModel = OptionalId<{
  name: string; 
  comportamiento: Comportamiento;
  ubicacion: ObjectId;
}>;

//Lugar
export type Lugar = OptionalId<{
  nombre: string; 
  coordenadas: { lat: number; log: number };
  numNiniosBuenos: number;
}>;