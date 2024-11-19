import {ObjectId, type OptionalId} from "mongodb"

export type Comportamiento = "bueno" | "malo";
export type Coordenadas = {lat:number, log:number}

export type NinoModel = OptionalId <{
    nombre: string,
    comportamiento: Comportamiento,
    ubicacion: ObjectId
}>
export type LugarModel = OptionalId <{
    nombre: string,
    coordenadas: Coordenadas,
    numNinosBuenos: number
}>

export type Nino = {
    id: string,
    nombre: string
    comportamiento: Comportamiento,
    ubicacion: ObjectId
}

export type Lugar = {
    id: string,
    nombre: string,
    coordenadas: Coordenadas,
    numNinosBuenos: number
}