// app/lib/parts-data.ts
import type { PolygonShape, Side, ProjectPart } from '@/app/lib/types';

const createRectangle = (id: number, width: number, height: number): PolygonShape => {
    const sides: Side[] = [
        { length: height, unit: 'mm' }, { length: width, unit: 'mm' },
        { length: height, unit: 'mm' }, { length: width, unit: 'mm' },
    ];
    return {
        id, type: 'polygon', sides, rotation: 0, position: { x: 0, y: 0 }
    };
};

// NOVO: Lista expandida de peças para um projeto de armário mais completo.
const projectCuttingList: Omit<ProjectPart, 'quantity'>[] = [
    { id: 101, name: 'Porta de Armário (G)', shape: createRectangle(101, 700, 450) },
    { id: 102, name: 'Porta de Armário (P)', shape: createRectangle(102, 500, 350) },
    { id: 103, name: 'Lateral de Módulo', shape: createRectangle(103, 720, 550) },
    { id: 104, name: 'Base / Topo de Módulo', shape: createRectangle(104, 800, 550) },
    { id: 105, name: 'Prateleira Interna', shape: createRectangle(105, 764, 530) },
    { id: 106, name: 'Frente de Gaveta (G)', shape: createRectangle(106, 764, 200) },
    { id: 107, name: 'Frente de Gaveta (P)', shape: createRectangle(107, 764, 150) },
    { id: 108, name: 'Lateral de Gaveta', shape: createRectangle(108, 500, 120) },
    { id: 109, name: 'Fundo de Gaveta', shape: createRectangle(109, 734, 500) },
    { id: 110, name: 'Fundo de Armário (MDF 6mm)', shape: createRectangle(110, 800, 720) },
    { id: 111, name: 'Rodapé Frontal', shape: createRectangle(111, 800, 150) },
];

export function getProjectParts(): ProjectPart[] {
    // Quantidades de exemplo para o projeto
    return [
        { ...projectCuttingList[0], quantity: 2 },
        { ...projectCuttingList[1], quantity: 4 },
        { ...projectCuttingList[2], quantity: 2 },
        { ...projectCuttingList[3], quantity: 2 },
        { ...projectCuttingList[4], quantity: 3 },
        { ...projectCuttingList[5], quantity: 2 },
        { ...projectCuttingList[6], quantity: 2 },
        { ...projectCuttingList[7], quantity: 8 },
        { ...projectCuttingList[8], quantity: 4 },
        { ...projectCuttingList[9], quantity: 1 },
        { ...projectCuttingList[10], quantity: 1 },
    ];
}