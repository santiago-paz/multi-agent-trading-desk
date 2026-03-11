import React from 'react';
import { DatosPerfil, EstadoCuenta } from '@/lib/iol/types';

interface AccountDataProps {
  perfil: DatosPerfil | null;
  estadoCuenta: EstadoCuenta | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const AccountData: React.FC<AccountDataProps> = ({ perfil, estadoCuenta, isLoading, onRefresh }) => {
  return (
    <div className="flex flex-col h-full overflow-hidden p-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="m-0 text-sm font-bold">Datos de la Cuenta</h3>
        <button className="default text-xs px-2 py-1" onClick={onRefresh} disabled={isLoading}>
          Refrescar
        </button>
      </div>

      <div className="flex-1 overflow-auto space-y-4 pr-1">
        {isLoading && (!perfil || !estadoCuenta) ? (
          <p className="m-0 p-2 italic text-sm">Cargando datos de la cuenta...</p>
        ) : (
          <>
            {/* Perfil del Inversor */}
            <fieldset>
              <legend>Perfil</legend>
              {perfil ? (
                <div className="field-row-stacked">
                  <div className="field-row justify-between text-xs">
                    <span>Nombre:</span>
                    <strong>{perfil.nombre} {perfil.apellido}</strong>
                  </div>
                  <div className="field-row justify-between text-xs">
                    <span>Nro Cuenta:</span>
                    <strong>{perfil.numeroCuenta}</strong>
                  </div>
                  <div className="field-row justify-between text-xs">
                    <span>Email:</span>
                    <strong>{perfil.email}</strong>
                  </div>
                  <div className="field-row justify-between text-xs">
                    <span>Perfil Inversor:</span>
                    <strong>{perfil.perfilInversor}</strong>
                  </div>
                </div>
              ) : (
                <p className="m-0 text-xs italic text-gray-600">No se pudo cargar el perfil.</p>
              )}
            </fieldset>

            {/* Estado de Cuenta */}
            <fieldset>
              <legend>Estado de Cuenta</legend>
              {estadoCuenta ? (
                <div className="space-y-3">
                  <div className="field-row-stacked">
                    {estadoCuenta.cuentas.map((cuenta, index) => (
                      <div key={index} className="sunken-panel p-2 mb-2 text-xs">
                        <div className="flex justify-between font-bold mb-1">
                          <span>{cuenta.tipo.toUpperCase()}</span>
                          <span>{cuenta.numero}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Saldo Disponible:</span>
                          <span className={cuenta.saldoDisponible >= 0 ? 'text-green-700' : 'text-red-700'}>
                            ${cuenta.saldoDisponible.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Saldo a Liquidar:</span>
                          <span>${cuenta.saldoAliquidar.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="font-bold underline text-xs m-0 mb-1">Últimos Movimientos</p>
                    {estadoCuenta.movimientos && estadoCuenta.movimientos.length > 0 ? (
                      <div className="overflow-x-auto border border-gray-400">
                        <table className="w-full text-xs">
                          <thead className="bg-[#c0c0c0]">
                            <tr>
                              <th className="font-normal text-left p-1 border-r border-b border-gray-400">Fecha</th>
                              <th className="font-normal text-left p-1 border-r border-b border-gray-400">Tipo</th>
                              <th className="font-normal text-right p-1 border-r border-b border-gray-400">Monto</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {estadoCuenta.movimientos.map((mov, i) => (
                              <tr key={i} className="border-b border-gray-300">
                                <td className="p-1 border-r border-gray-300 whitespace-nowrap">
                                  {new Date(mov.fecha).toLocaleDateString()}
                                </td>
                                <td className="p-1 border-r border-gray-300">
                                  {mov.tipoOperacion}
                                </td>
                                <td className={`p-1 text-right ${mov.monto >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                  ${mov.monto.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="m-0 text-xs italic text-gray-600">No hay movimientos recientes.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="m-0 text-xs italic text-gray-600">No se pudo cargar el estado de cuenta.</p>
              )}
            </fieldset>
          </>
        )}
      </div>
    </div>
  );
};
