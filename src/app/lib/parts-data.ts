// app/lib/parts-data.ts

// AQUI ESTÁ A CORREÇÃO: Usamos o alias '@/' para o caminho absoluto.
import type { PolygonShape, Side, ProjectPart } from '@/app/lib/types';

// Função auxiliar para criar um retângulo facilmente
const createRectangle = (id: number, width: number, height: number): PolygonShape => {
    const sides: Side[] = [
        { length: height, unit: 'mm' },
        { length: width, unit: 'mm' },
        { length: height, unit: 'mm' },
        { length: width, unit: 'mm' },
    ];
    return {
        id,
        type: 'polygon',
        sides,
        rotation: 0,
        position: { x: 0, y: 0 } // Posição inicial será definida ao adicionar ao canvas
    };
};

// Lista de peças que formam um projeto de corte exemplo.
// Em uma aplicação real, o usuário montaria essa lista em outra página.
const projectCuttingList: Omit<ProjectPart, 'quantity'>[] = [
    { id: 101, name: 'Porta de Armário', shape: createRectangle(101, 600, 400) },
    { id: 102, name: 'Prateleira', shape: createRectangle(102, 564, 480) },
    { id: 103, name: 'Frente de Gaveta', shape: createRectangle(103, 564, 150) },
    { id: 104, name: 'Lateral de Gaveta', shape: createRectangle(104, 450, 120) },
];

// Função que retorna o projeto de corte com quantidades definidas
export function getProjectParts(): ProjectPart[] {
    // Mock de quantidades para o exemplo
    return [
        { ...projectCuttingList[0], quantity: 2 },
        { ...projectCuttingList[1], quantity: 4 },
        { ...projectCuttingList[2], quantity: 4 },
    ];
}