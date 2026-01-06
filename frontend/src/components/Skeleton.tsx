/**
 * Skeleton Loading Components
 * Componentes para exibir durante carregamento de dados
 */
import React from 'react';

// Skeleton base animado
export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => (
    <div className={`animate-pulse bg-gradient-to-r from-surface-200 via-surface-100 to-surface-200 bg-[length:200%_100%] rounded ${className}`} {...props} />
);

// Card de estatística skeleton
export const StatCardSkeleton: React.FC = () => (
    <div className="card p-4">
        <div className="flex items-center gap-3 mb-2">
            <Skeleton className="w-9 h-9 rounded-xl" />
            <Skeleton className="w-24 h-3" />
        </div>
        <Skeleton className="w-20 h-8 mb-2" />
        <Skeleton className="w-32 h-3" />
    </div>
);

// Linha de tabela skeleton
export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
    <tr className="border-b border-surface-100">
        {Array.from({ length: cols }).map((_, i) => (
            <td key={i} className="px-4 py-3">
                <Skeleton className="w-full h-4" />
            </td>
        ))}
    </tr>
);

// Card de serviço skeleton
export const ServiceCardSkeleton: React.FC = () => (
    <div className="card p-4">
        <div className="flex items-center gap-3 mb-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex-1">
                <Skeleton className="w-3/4 h-4 mb-2" />
                <Skeleton className="w-1/2 h-3" />
            </div>
            <Skeleton className="w-20 h-6 rounded-full" />
        </div>
        <Skeleton className="w-full h-3 mb-2" />
        <Skeleton className="w-2/3 h-3" />
    </div>
);

// Gráfico skeleton
export const ChartSkeleton: React.FC = () => (
    <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
            <Skeleton className="w-48 h-5" />
        </div>
        <div className="h-56 sm:h-64 flex items-end gap-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end">
                    <Skeleton
                        className="w-full rounded-t"
                        style={{ height: `${30 + Math.random() * 70}%` }}
                    />
                </div>
            ))}
        </div>
    </div>
);

// Dashboard skeleton completo
export const DashboardSkeleton: React.FC = () => (
    <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-4 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
                <Skeleton className="w-48 h-7 mb-2" />
                <Skeleton className="w-32 h-4" />
            </div>
            <div className="flex gap-2">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <Skeleton className="w-28 h-10 rounded-xl hidden sm:block" />
            </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card p-3 text-center">
                    <Skeleton className="w-12 h-8 mx-auto mb-2" />
                    <Skeleton className="w-16 h-3 mx-auto" />
                </div>
            ))}
        </div>

        {/* Chart and Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2">
                <ChartSkeleton />
            </div>
            <div className="card p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                    <Skeleton className="w-24 h-5" />
                    <Skeleton className="w-16 h-4" />
                </div>
                <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3">
                            <Skeleton className="w-10 h-10 rounded-xl" />
                            <div className="flex-1">
                                <Skeleton className="w-3/4 h-4 mb-2" />
                                <Skeleton className="w-1/3 h-3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

export default Skeleton;
