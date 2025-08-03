// app/lib/data.ts

import type { Material } from './types';

const materials: Material[] = [
    { id: 1, name: 'Chapa MDF 18mm (Padrão)', width: 2750, height: 1850 },
    { id: 2, name: 'Chapa MDF 15mm (Padrão)', width: 2750, height: 1850 },
    { id: 3, name: 'Chapa Compensado 10mm', width: 2200, height: 1600 },
    { id: 4, name: 'Painel Pinus 30mm', width: 3000, height: 1200 },
];

export function getMaterials(): Material[] {
    return materials;
}

export function getMaterialById(id: number): Material | undefined {
    return materials.find(m => m.id === id);
}