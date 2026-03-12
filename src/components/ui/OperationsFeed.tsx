import React from 'react';
import { Operation } from '@/lib/iol/types';

interface OperationsFeedProps {
  operations: Operation[];
  cclRate: number;
  isLoading: boolean;
  onRefresh: () => void;
}

export function OperationsFeed({ operations, cclRate, isLoading, onRefresh }: OperationsFeedProps) {
  return (
    <div className="flex flex-col h-full bg-[#c0c0c0]">
      <div className="flex justify-between items-center mb-2 px-1">
        <p className="m-0 text-sm font-bold">Últimos Movimientos (IOL)</p>
        <button onClick={onRefresh} disabled={isLoading} className="default px-2 py-1 text-xs">
          {isLoading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      <div className="flex-1 overflow-auto sunken-panel bg-white p-1">
        {isLoading && operations.length === 0 ? (
          <div className="p-4 text-center">Cargando movimientos...</div>
        ) : operations.length === 0 ? (
          <div className="p-4 text-center">No hay movimientos recientes.</div>
        ) : (
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-[#dfdfdf] border-b border-[#808080]">
                <th className="p-1 text-left border-r border-[#808080] font-normal">Fecha</th>
                <th className="p-1 text-left border-r border-[#808080] font-normal">Símbolo</th>
                <th className="p-1 text-left border-r border-[#808080] font-normal">Tipo</th>
                <th className="p-1 text-right border-r border-[#808080] font-normal">Cant.</th>
                <th className="p-1 text-right border-r border-[#808080] font-normal">Precio</th>
                <th className="p-1 text-right border-r border-[#808080] font-normal">Monto</th>
                <th className="p-1 text-center font-normal">Estado</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((op, i) => (
                <tr key={op.numero || i} className="border-b border-[#dfdfdf] hover:bg-[#000080] hover:text-white cursor-default group">
                  <td className="p-1 whitespace-nowrap">{new Date(op.fechaOrden).toLocaleDateString()}</td>
                  <td className="p-1 font-bold">{op.simbolo}</td>
                  <td className={`p-1 ${op.tipo === 'Compra' ? 'text-green-700' : 'text-red-700'} group-hover:text-white`}>{op.tipo}</td>
                  <td className="p-1 text-right">{op.cantidad ?? '-'}</td>
                  <td className="p-1 text-right">{op.precio != null ? `U$D ${(op.precio / cclRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
                  <td className="p-1 text-right">{op.monto != null ? `U$D ${(op.monto / cclRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
                  <td className="p-1 text-center">{op.estado ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
