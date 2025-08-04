
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import mysql from 'mysql2/promise';
import { RequestBody, Filtros } from '../hello-world/interfaces/index';

import { generarExcelAutorizaciones } from './utils/generarExcelAutorizaciones';



export const consultarAutorizacionesHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body: RequestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const filtros: Partial<Filtros> = body?.filtros || {};

    const usuario = body.rolUsuario ?? '';

    const numeroPagina = Number(body?.paginacion?.numeroPagina ?? 1);
    const tamanioPagina = Number(body?.paginacion?.tamanioPagina ?? 20);
    const offset = (numeroPagina - 1) * tamanioPagina;



    const nombreArchivo = `autorizaciones_${Date.now()}.xlsx`;


    //if (!filtros.fechaDesde || !filtros.fechaHasta || !filtros.numeroTarjeta)
    if (!filtros.fechaDesde || !filtros.fechaHasta) {
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
    });

    const [rows] = await connection.query(
      'CALL pa_consultar_autorizaciones(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,?)',
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

    const registros = rows[0];//contiene el conjunto de registros paginados (por ejemplo, 20 registros).
    const totalRegistros = rows[1]?.[0]?.total_registros ?? 0;//contiene el total de registros sin paginar, útil para saber cuántas páginas hay (esto normalmente se calcula con un COUNT(*) OVER() dentro del SP).

    const puedeVer = await puedeVerTarjetaSinEnmascarar(usuario, connection);

    console.log(`Usuario: ${usuario}, ¿Puede ver tarjeta sin enmascarar?:`, puedeVer);


    const autorizaciones = await Promise.all(
      registros.map(async row => {
        const panEnmascarado = await aplicarEnmascaramientoDesdeBD(row.vi_c2_tarjeta2, puedeVer, connection);
        return {
          fechaProceso: row.vi_fecha_proceso,
          fechaHoraTransaccion: row.vi_fechahora,
          cuenta: row.vi_cuenta,
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

     await connection.end();

    if (!registros || registros.length === 0) {
      return response(404, {
        estado: 'ERROR',
        codigoRespuesta: '404',
        mensaje: 'No se encontraron autorizaciones para los criterios de búsqueda especificados.',
        data: null
      });
    }

    const rutaExcel = await generarExcelAutorizaciones(registros, tamanioPagina, nombreArchivo);
    console.log('✅ Excel generado en:', rutaExcel);

    return {
      statusCode: 200,
      body: JSON.stringify({
        estado: "EXITO",
        codigoRespuesta: "000",
        mensaje: "Consulta general de autorizaciones realizada exitosamente.",
        data: {
          totalRegistros,
          totalPagina: Math.ceil(totalRegistros / tamanioPagina),
          paginaActual: numeroPagina,
          tamanioPagina,
          autorizaciones
        }
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





