export interface Filtros {
    fechaDesde: string;
    fechaHasta: string;
    tipoAutorizacion?: string;
    numeroAutorizacion?: string;
    tipoFranquicia?: string;
    nombreCadena?: string;
    nombreComercio?: string;
    numeroTarjeta: string;
    cuenta?: string;
    codigoGiro?: string;
    codigoMarca?: string;
    tipoEmisor?: string;
    tipoProducto?: string;
    tipoDiferido?: string;
    numeroCuotas?: number;
    tipoMensaje?: string;
    estadoAutorizacion?: string;
}

export interface Paginacion{
    numeroPagina: number;
    tamanioPagina: number;
}

export interface RequestBody{
    filtros: Filtros;
    paginacion: Partial<Paginacion>;
    rolUsuario?: string;
}