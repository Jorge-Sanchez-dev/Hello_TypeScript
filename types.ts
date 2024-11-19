import { ObjectId} from "mongodb";

//Tipo Comportamiento
export type Comportamiento = 'bueno' | 'malo';

//Ninio
export type Ninio = {
  name: string; 
  comportamiento: Comportamiento;
  ubicacion: ObjectId;
};

//Lugar
export type Lugar = {
  nombre: string; 
  coordenadas: { lat: number; lng: number };
  numNiniosBuenos: number;
};