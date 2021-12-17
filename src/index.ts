// COMO ACTUAR ANTE DUPLICADOS
// EL CODIGOPROVINCIA/LOCALIDAD VIENE DEL CODIGO POSTAL? LO TENIAMOS MAL EN LA PLANTILLA?
import {
  BibliotecaModel,
  LocalidadModel,
  ProvinciumModel,
} from "./../../IEIBack/src/models/biblioteca.models";
import { BibliotecaCAT, Propietat } from "./catmodel";
const fs = require("fs");
import path from "path";
import { convertXMLToJSON } from "../../IEICAT/src";
const { Biblioteca, Localidad, Provincia } = require("../../IEIBack/src/sqldb");

export async function extractDataCAT(rawData: BibliotecaCAT[]) {
  console.log("Extracting CAT_DATA");

  const provincias: ProvinciumModel[] = getProvincias(rawData);
  const localidades: LocalidadModel[] = getLocalidades(rawData);
  const bibliotecas: BibliotecaModel[] = getBibliotecas(rawData);

  console.log("Populating CAT_DATA");
  await populateDB(provincias, localidades, bibliotecas);
  setTimeout(() => {
    checkIfLocalidadNoExiste(localidades, bibliotecas)

  }, 10000);
  return { numLocalidades: localidades.length, numProvincias: provincias.length }

}

function checkIfLocalidadNoExiste(localidades: LocalidadModel[], bibliotecas: BibliotecaModel[]) {
  const nombresBib: string[] = [];
  const nombresLocalidad: string[] = []
  const res: string[] = [];
  bibliotecas.forEach(biblioteca => {
    nombresBib.push(biblioteca.LocalidadNombreLocalidad)
  })

  localidades.forEach(localidad => {
    nombresLocalidad.push(localidad.nombreLocalidad)
  })

  nombresBib.forEach(nb => {
    if (!nombresLocalidad.includes(nb)) {
      res.push(nb)
    }
  })
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
    const nombreProvincia = provincias.filter(provincia => provincia.codigoProvincia === codPostal.slice(0, 2))[0].nombreProvincia;

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

function getTipo(propietats: Propietat[]) {
  let tipo = "Pública"
  propietats.forEach(propietat => {
    if (propietat.Titularitat) {
      if (propietat.Titularitat === 'Privada') {
        tipo = "Privada"
      }
    }
  })
  return tipo;
}

function getBibliotecas(bibliotecas: BibliotecaCAT[]): BibliotecaModel[] {
  let bibliotecasRes: BibliotecaModel[] = [];

  bibliotecas.forEach(biblioteca => {
    const provincia: BibliotecaModel = {
      nombre: biblioteca.nom._text,
      tipo: getTipo(biblioteca.propietats),
      direccion: biblioteca.via._text,
      codigoPostal: biblioteca.cpostal._text,
      longitud: +biblioteca.longitud._text,
      latitud: +biblioteca.latitud._text,
      telefono: biblioteca.telefon1?._text || '',
      email: biblioteca.email._text,
      descripcion: (biblioteca.alies._text + ' ' + biblioteca.categoria._text.replace(/|/g, ' ')).trim(),
      LocalidadNombreLocalidad: biblioteca.poblacio._text.replace(/\//g, '-'),
    }

    bibliotecasRes.push(provincia)
  })

  const bibliotecasUnicas: BibliotecaModel[] = []

  bibliotecasRes.forEach(biblioteca => {
    const repeated = bibliotecasUnicas.filter(bibliotecaUnica => {
      return bibliotecaUnica.nombre === biblioteca.nombre
    })

    if (!repeated.length) {
      bibliotecasUnicas.push(biblioteca)
    }
  })

  return bibliotecasUnicas;
}

async function populateDB(provincias: ProvinciumModel[], localidades: LocalidadModel[], bibliotecas: BibliotecaModel[]) {
  const prov = await Provincia.bulkCreate(
    provincias,
    {
      ignoreDuplicates: true
    }
  )
  console.log('SUCCESS POPULATING PROVINCIAS', prov.length);
  const pob = await Localidad.bulkCreate(
    localidades,
    {
      ignoreDuplicates: true
    }
  )
  console.log('SUCCESS POPULATING LOCALIDADES', pob.length);
  const bibl = await Biblioteca.bulkCreate(
    bibliotecas,
    {
      updateOnDuplicate: [
        'nombre',
        'tipo',
        'direccion',
        'codigoPostal',
        'longitud',
        'latitud',
        'telefono',
        'email',
        'descripcion',
      ]
    }
  )
  console.log('SUCCESS POPULATING BIBLIOTECAS', bibl.length);
}

function testExtractor() {
  const rawData = fs.readFileSync(path.join(__dirname, '../CAT.xml')).toString();
  const parsedData = convertXMLToJSON(rawData);
  extractDataCAT(parsedData);
}

// testExtractor();