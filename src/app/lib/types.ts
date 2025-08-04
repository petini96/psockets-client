// Tipos Geométricos e de Forma
export type Unit = 'mm' | 'cm' | 'm';
export type ShapeType = 'polygon' | 'circle';

export interface Vector {
    x: number;
    y: number;
}

export interface BaseShape {
    id: number;
    type: ShapeType;
    position: Vector;
    originId?: number; // ID da peça de origem do projeto
}

export interface PolygonShape extends BaseShape {
    type: 'polygon';
    sides: Side[];
    rotation: number;
}

export interface CircleShape extends BaseShape {
    type: 'circle';
    radius: number;
    unit: Unit;
}

export type Shape = PolygonShape | CircleShape;

export interface Side {
    length: number;
    unit: Unit;
}

export interface Projection {
    min: number;
    max: number;
}

// Tipos de Interação do Usuário
export type Interaction =
    | { type: 'drag'; id: number; initialPositions: Map<number, Vector> } // ATUALIZADO
    | { type: 'rotate'; id: number; startAngle: number; initialRotation: number }
    | { type: 'scale'; id: number; initialShape: Shape; initialDistance: number }
    | { type: 'marquee'; start: Vector; end: Vector } // NOVO
    | null;

// Tipo para Materiais (Chapas)
export interface Material {
    id: number;
    name: string;
    width: number;
    height: number;
}

// Tipo para Peças do Projeto
export interface ProjectPart {
    id: number;
    name: string;
    shape: PolygonShape;
    quantity: number;
}