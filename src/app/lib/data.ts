// app/lib/data.ts
import type { Material } from './types';

// NOVO: Lista expandida de materiais com mais opções de MDF, compensado e outros.
const materials: Material[] = [
  { id: 1, name: 'Chapa MDF 18mm (Branco TX)', width: 2750, height: 1850 },
  { id: 2, name: 'Chapa MDF 15mm (Branco TX)', width: 2750, height: 1850 },
  { id: 3, name: 'Chapa MDF 6mm (Cru)', width: 2750, height: 1850 },
  { id: 4, name: 'Chapa Compensado Naval 10mm', width: 2200, height: 1600 },
  { id: 5, name: 'Chapa Compensado Virola 15mm', width: 2500, height: 1600 },
  { id: 6, name: 'Painel Pinus Finger Joint 18mm', width: 3000, height: 1200 },
  { id: 7, name: 'Chapa MDF 25mm (Madeirado Freijó)', width: 2750, height: 1850 },
  { id: 8, name: 'Chapa OSB Home 12mm', width: 2440, height: 1220 },
  { id: 9, name: 'Chapa Aglomerado 15mm', width: 2750, height: 1840 },
];

export function getMaterials(): Material[] {
    return materials;
}

export function getMaterialById(id: number): Material | undefined {
    return materials.find(m => m.id === id);
}