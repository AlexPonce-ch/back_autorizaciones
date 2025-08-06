
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import mysql from 'mysql2/promise';
import { RequestBody, Filtros } from '../hello-world/interfaces/index';
import { generarExcelAutorizaciones } from './utils/generarExcelAutorizaciones';
import { S3Client, PutObjectCommand} from "@aws-sdk/client-s3";
import fs from "fs";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";



export const consultarAutorizacionesHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body: RequestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const filtros: Partial<Filtros> = body?.filtros || {};
    const usuario = body.rolUsuario ?? '';
    const numeroPagina = Number(body?.paginacion?.numeroPagina ?? 1);
    const tamanioPagina = Number(body?.paginacion?.tamanioPagina ?? 20);
    const nombreArchivo = `autorizaciones_${Date.now()}.xlsx`;


    //if (!filtros.fechaDesde || !filtros.fechaHasta || !filtros.numeroTarjeta)
    if (!filtros.fechaDesde || !filtros.fechaHasta || !filtros.numeroTarjeta) {
      return response(400, {
        estado: 'ERROR',
        codigoRespuesta: '400',
        mensaje: 'Parámetros de entrada inválidos. Verifique las fechas o filtros proporcionados.'
      });
    }

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3307'),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      multipleStatements: true,
    });

    //const puedeVer = await puedeVerTarjetaSinEnmascarar(usuario, connection);
    const todasLasAutorizaciones: any[] = [];

    let paginaActual = numeroPagina;
    let totalRegistros = 0

    while (true) {
      const offset = (paginaActual  - 1) * tamanioPagina;

      const [rows] = await connection.query(
        'CALL pa_consultar_autorizaciones(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          filtros.fechaDesde,
          filtros.fechaHasta,
          filtros.tipoAutorizacion,
          filtros.numeroAutorizacion,
          filtros.tipoFranquicia,
          filtros.nombreCadena,
          filtros.nombreComercio,
          filtros.numeroTarjeta,
          filtros.cuenta,
          filtros.codigoGiro,
          filtros.codigoMarca,
          filtros.tipoEmisor,
          filtros.tipoProducto,
          filtros.tipoDiferido,
          filtros.numeroCuotas,
          filtros.tipoMensaje,
          filtros.estadoAutorizacion,
          offset,
          tamanioPagina
        ]
      );

      const registrosPagina = rows[0];
      totalRegistros = rows[1]?.[0]?.total_registros ?? 0;
      
      if (!registrosPagina || registrosPagina.length === 0) {
      return response(404, {
        estado: 'ERROR',
        codigoRespuesta: '404',
        mensaje: 'No se encontraron autorizaciones para los criterios de búsqueda especificados.',
        data: null
      });
    }

      const autorizacionesPagina = await Promise.all(
        registrosPagina.map(async row => {
          // const panEnmascarado = await aplicarEnmascaramientoDesdeBD(row.vi_c2_tarjeta2, puedeVer, connection);
          const panEnmascarado = await aplicarEnmascaramientoDesdeSP(row.vi_c2_tarjeta2, usuario, connection);
          return {
            fechaProceso: row.vi_fecha_proceso,
            fechaHoraTransaccion: row.vi_fechahora,
            cuenta: row.mp_cuenta,
            numeroTarjeta: panEnmascarado,
            fechaExpiracion: row.vi_c14_exp_date,
            tipoMensaje: row.vi_msgType,
            monedaDestino: row.vi_c51_currency_code_cardbill,
            montoAutorizado: row.vi_c5_monto_settlement,
            respuestaIso: {
              codigo: row.vi_c39_resp_code,
              descripcion: row.vi_c39_resp_desc
            },
            tipoTransaccion: {
              codigo: row.vi_c3_proccode,
              descripcion: ""
            },
            numeroAutorizacion: row.vi_c38_autorizacion,
            modoEntradaCaptura: row.vi_pos_entry_mode,
            codigoComercio: row.vi_c42_card_acceptor_id,
            nombreComercio: row.vi_nombre_comercio,
            nombreCadena: row.vi_descadena,
            giro: row.vi_c18_merchant_type,
            descripcionGiro: row.vi_des_merchant_type,
            codigoProcesoOnline: "",
            ciudad: row.vi_c43_card_acceptor_name_loc,
            pais: "",
            indicadorPresenciaCvv2: row.vi_ind_cvv,
            tipoFranquicia: row.vi_tipoFranquicia,
            montoOrigen: row.vi_c4_monto,
            productoMarca: "",
            tidTerminal: row.vi_c41_terminal_id,
            tipoDiferido: row.vi_codtipodiferido,
            numeroCuotasPactadas: row.vi_cuotaspactadas,
            binAdquirente: row.vi_c32_acq_inst_id,
            binEmisor: "",
            descripcionBinEmisor: "",
            respuestaInterna: "",
            recurrente: "",
            eci: "",
            termEntryCapab: "",
            voucher: "",
            chipCondicionCode: "",
            tipoEmisor: "",
            tipoFactura: "",
            procesado: "",
            tipoProducto: "",
            numeroTransaccion: "",
            atcActual: "",
            atcAutorizacion: "",
            campo34: "",
            campo55: "",
            campo56: ""
          };
        })
      );

      todasLasAutorizaciones.push(...autorizacionesPagina);
      if (todasLasAutorizaciones.length >= totalRegistros) break;
      paginaActual++;
    }

    await connection.end();

    //console.log(`Usuario: ${usuario}, ¿Puede ver tarjeta sin enmascarar?:`, puedeVer);
    const rutaExcel = await generarExcelAutorizaciones(todasLasAutorizaciones, nombreArchivo);
    const s3Url = await uploadFileToS3(rutaExcel, 'bb-emisormdp-datasource', nombreArchivo);
    console.log('Excel generado en:', s3Url);
    
    
    const totalPaginas = Math.ceil(totalRegistros / tamanioPagina);
    const dataPaginada = Array.from({ length: totalPaginas }, (_, i) => {
      const inicio = i * tamanioPagina;
      const fin = inicio + tamanioPagina;
      return {
        paginaActual: i + 1,
        tamanioPagina,
        autorizaciones: todasLasAutorizaciones.slice(inicio, fin)
      };
    });


    return {
      statusCode: 200,
      body: JSON.stringify({
        estado: "EXITO",
        codigoRespuesta: "000",
        mensaje: "Consulta general de autorizaciones realizada exitosamente.",
        totalRegistros,
        totalPagina: Math.ceil(totalRegistros / tamanioPagina),
        data: dataPaginada
      })
    };
  } catch (error: any) {
    console.error('Error:', error);
    return response(503, {
      estado: 'ERROR',
      codigoRespuesta: '503',
      mensaje: 'El servicio del Procesador de Tarjeta de Crédito no está disponible. Por favor, intente más tarde.',
      data: null
    });
  }
};

function response(statusCode: number, body: any): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}

async function aplicarEnmascaramientoDesdeSP(
  pan: string,
  usuario: string,
  connection: mysql.Connection
): Promise<string> {
  try {
    const sql = "CALL sp_enmascarar_pan(?, ?, @out_pan); SELECT @out_pan AS pan;";
    const [results] = await connection.query(sql, [usuario, pan]);

    const panEnmascarado = (results as any[])[1]?.[0]?.pan;
    return panEnmascarado ?? pan;
  } catch (error) {
    console.error("Error en aplicarEnmascaramientoDesdeSP:", error);
    return pan;
  }
}

/*
async function aplicarEnmascaramientoDesdeSP(
  usuario: string,
  pan: string,
  connection: mysql.Connection
): Promise<string> {
  const [resultSets] = await connection.query(
    "CALL sp_enmascarar_pan(?, ?, @out_pan); SELECT @out_pan AS pan;",
    [pan, usuario]
  );
  const result = Array.isArray(resultSets[1]) ? resultSets[1][0] : null;
  return result?.pan ?? pan;
}
*/

/*
async function puedeVerTarjetaSinEnmascarar(usuario: string, connection: mysql.Connection): Promise<boolean> {
  const [rows] = await connection.query(
    `SELECT COUNT(1) AS permitido
     FROM adq_m_seg_usuario us
     INNER JOIN adq_m_seg_rol_usuario ru ON us.us_id = ru.ru_idusuario
     INNER JOIN adq_m_seg_rol ro ON ru.ru_idrol = ro.ro_id
     WHERE us.us_usuario = ?
       AND ro.ro_enmascarar = 0
       AND ru.ru_estado = 'A'
       AND us.us_estado = 'A'`,
    [usuario]
  );
  return rows[0]?.permitido === 1;
}
async function aplicarEnmascaramientoDesdeBD(
  pan: string,
  mostrarCompleto: boolean,
  connection: mysql.Connection
): Promise<string> {
  const [rows] = await connection.query(
  'SELECT fn_enmascarar(?, ?, ?, ?, ?) AS pan',
  [mostrarCompleto ? 1 : 0, 'X', 6, 6, pan] 
);
  return rows[0]?.pan ?? pan;
}
*/

export async function uploadFileToS3(filePath: string, bucket: string, key: string): Promise<string> {
  const s3 = new S3Client({ region: 'us-east-1' });
  try {
    const fileStream = fs.createReadStream(filePath);

    const uploadParams = {
      Bucket: bucket,
      Key: key,
      Body: fileStream,
    };

    await s3.send(new PutObjectCommand(uploadParams));


    const command = new PutObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return url;
  } catch (error) {
    console.error('Error al subir archivo a S3:', error);
    throw new Error('No se pudo subir el archivo a S3');
  }
}











