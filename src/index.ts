// COMO ACTUAR ANTE DUPLICADOS
// EL CODIGOPROVINCIA/LOCALIDAD VIENE DEL CODIGO POSTAL? LO TENIAMOS MAL EN LA PLANTILLA?
import {
  BibliotecaModel,
  LocalidadModel,
  ProvinciumModel,
} from "./../../IEIBack/src/models/biblioteca.models";
import { BibliotecaCAT } from "./catmodel";
const fs = require("fs");
import path from "path";
const { Biblioteca, Localidad, Provincia } = require("../../IEIBack/src/sqldb");

export function extractDataCAT(rawData: BibliotecaCAT[]) {
  console.log("Extracting CAT_DATA");

  const provincias: ProvinciumModel[] = getProvincias(rawData);
  const localidades: LocalidadModel[] = getLocalidades(rawData);
  // const bibliotecas: BibliotecaModel[] = getBibliotecas(rawData);

  console.log("Populating CAT_DATA");
  populateDB(provincias, localidades, []);
  // populateDB(provincias, localidades, bibliotecas);
}

function getProvincias(bibliotecas?: BibliotecaCAT[]): ProvinciumModel[] {
  let provincias: ProvinciumModel[] = [
    {
      codigoProvincia: "17",
      nombreProvincia: "Girona",
    },
    {
      codigoProvincia: "08",
      nombreProvincia: "Barcelona",
    },
    {
      codigoProvincia: "25",
      nombreProvincia: "Lleida",
    },
    {
      codigoProvincia: "43",
      nombreProvincia: "Tarragona",
    },
  ];

  return provincias;
}

function getLocalidades(bibliotecas: BibliotecaCAT[]): LocalidadModel[] {
  let localidades: LocalidadModel[] = [];
  const provincias = getProvincias();

  bibliotecas.forEach((biblioteca) => {
    const codPostal = biblioteca.cpostal._text;
    const codLocalidad = codPostal.slice(2);

    const nombreProvincia = provincias.filter(provincia => provincia.codigoProvincia === codPostal.slice(0,2))[0].nombreProvincia;


    const localidad: LocalidadModel = {
      codigoLocalidad: codLocalidad,
      nombreLocalidad: biblioteca.poblacio._text,
      ProvinciumNombreProvincia: nombreProvincia,
    };

    if (
      localidad.codigoLocalidad &&
      localidad.nombreLocalidad &&
      localidad.ProvinciumNombreProvincia
    ) {
      localidades.push(localidad);
    }
  });
  const localidadesUnicas: LocalidadModel[] = [];

  localidades.forEach((localidad) => {
    const repeated = localidadesUnicas.filter((localUnica) => {
      return (
        localUnica.ProvinciumNombreProvincia ===
          localidad.ProvinciumNombreProvincia &&
        localUnica.codigoLocalidad === localidad.codigoLocalidad &&
        localUnica.nombreLocalidad === localidad.nombreLocalidad
      );
    });

    if (!repeated.length) {
      localidadesUnicas.push(localidad);
    }
  });

  return localidadesUnicas;
}

// function getBibliotecas(bibliotecas: BibliotecaCAT[]): BibliotecaModel[] {
//   let bibliotecasRes: BibliotecaModel[] = [];

//   bibliotecas.forEach(biblioteca => {
//     const provincia: BibliotecaModel = {
//       nombre: biblioteca.documentName,
//       tipo: 'Pública',
//       direccion: biblioteca.address,
//       codigoPostal: biblioteca.postalcode.replace('.', ''),
//       longitud: +biblioteca.lonwgs84,
//       latitud: +biblioteca.latwgs84,
//       telefono: biblioteca.phone.replace(/ /g, '').slice(0, 9),
//       email: biblioteca.email,
//       descripcion: biblioteca.documentDescription,
//       LocalidadNombreLocalidad: biblioteca.municipality.replace(/ /g, '').replace(/\//g, '-'),
//     }

//     bibliotecasRes.push(provincia)
//   })

//   const bibliotecasUnicas: BibliotecaModel[] = []

//   bibliotecasRes.forEach(biblioteca => {
//     const repeated = bibliotecasUnicas.filter(bibliotecaUnica => {
//       return bibliotecaUnica.nombre === biblioteca.nombre
//     })

//     if (!repeated.length) {
//       bibliotecasUnicas.push(biblioteca)
//     }
//   })

//   return bibliotecasUnicas;
// }

function populateDB(
  provincias: ProvinciumModel[],
  localidades: LocalidadModel[],
  bibliotecas: BibliotecaModel[]
) {
  Provincia.bulkCreate(provincias, {
    ignoreDuplicates: true,
  })
    .then(() => {
      console.log("SUCCESS POPULATING PROVINCIAS");
      Localidad.bulkCreate(localidades, {
        ignoreDuplicates: true,
      })
        .then(() => {
          console.log("SUCCESS POPULATING LOCALIDADES");
          Biblioteca.bulkCreate(bibliotecas, {
            updateOnDuplicate: [
              "tipo",
              "direccion",
              "codigoPostal",
              "longitud",
              "latitud",
              "telefono",
              "email",
              "descripcion",
            ],
          })
            .then(() => {
              console.log("SUCCESS POPULATING BIBLIOTECAS");
            })
            .catch(console.log);
        })
        .catch(console.log);
    })
    .catch(console.log);
}
// extractDataCAT(JSON.parse(fs.readFileSync(path.join(__dirname, './CAT.json')).toString()));
