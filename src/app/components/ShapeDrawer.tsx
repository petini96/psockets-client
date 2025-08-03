"use client"
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// Importando todos os tipos e dados necessários
import type { Material, Shape, PolygonShape, Interaction, Vector, Side, Unit, ShapeType, Projection, ProjectPart } from '@/app/lib/types';
import { getProjectParts } from '@/app/lib/parts-data';

// --- FUNÇÕES DE GEOMETRIA E COLISÃO ---

const unitToPx = (value: number, unit: Unit): number => {
    // A conversão mm para px é 1 para 1 neste contexto, para simplificar a escala.
    // A chapa de 2750x1850mm será um SVG de 2750x1850px.
    switch (unit) {
        case 'mm': return value;
        case 'cm': return value * 10;
        case 'm': return value * 1000;
        default: return value;
    }
};

// CORREÇÃO: Função ajustada para desenhar retângulos corretamente, não apenas polígonos regulares.
function calculateLocalVertices(sides: number, sidesLengths: Side[]): Vector[] {
    if (sides < 3) return [];

    // Lógica específica para retângulos, que é o caso de uso principal aqui
    if (sides === 4 && sidesLengths.length === 4) {
        const h = unitToPx(sidesLengths[0].length, sidesLengths[0].unit) / 2;
        const w = unitToPx(sidesLengths[1].length, sidesLengths[1].unit) / 2;
        return [
            { x: -w, y: -h }, // Top-left
            { x: w, y: -h },  // Top-right
            { x: w, y: h },   // Bottom-right
            { x: -w, y: h }   // Bottom-left
        ];
    }
    
    // Lógica original (fallback) para polígonos regulares
    const avgLengthPx = sidesLengths.reduce((acc, s) => acc + unitToPx(s.length, s.unit), 0) / sides;
    const radius = avgLengthPx / (2 * Math.sin(Math.PI / sides));
    const points: Vector[] = [];
    for (let i = 0; i < sides; i++) {
        const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
        points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }
    return points;
}

function calculateArea(shape: Shape): number {
    if (shape.type === 'circle') {
        const radiusPx = unitToPx(shape.radius, shape.unit);
        return Math.PI * radiusPx * radiusPx;
    }
    // Para retângulos, a área é mais simples
    if (shape.sides.length === 4) {
        const height = unitToPx(shape.sides[0].length, shape.sides[0].unit);
        const width = unitToPx(shape.sides[1].length, shape.sides[1].unit);
        return width * height;
    }
    // Lógica original (fallback)
    if (shape.sides.length < 3) return 0;
    const avgLengthPx = shape.sides.reduce((acc, s) => acc + unitToPx(s.length, s.unit), 0) / shape.sides.length;
    return (shape.sides.length * avgLengthPx * avgLengthPx) / (4 * Math.tan(Math.PI / shape.sides.length));
}

function getTransformedVertices(poly: PolygonShape): Vector[] {
    const localVertices = calculateLocalVertices(poly.sides.length, poly.sides);
    const angleRad = poly.rotation * (Math.PI / 180);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return localVertices.map(v => ({
        x: (v.x * cos - v.y * sin) + poly.position.x,
        y: (v.x * sin + v.y * cos) + poly.position.y,
    }));
}

function getAxes(vertices: Vector[]): Vector[] {
    const axes: Vector[] = [];
    for (let i = 0; i < vertices.length; i++) {
        const p1 = vertices[i];
        const p2 = vertices[i + 1] || vertices[0];
        const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
        const normal = { x: -edge.y, y: edge.x };
        const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
        if(length > 0) axes.push({ x: normal.x / length, y: normal.y / length });
    }
    return axes;
}

function project(vertices: Vector[], axis: Vector): Projection {
    let min = Infinity, max = -Infinity;
    for (const vertex of vertices) {
        const dotProduct = vertex.x * axis.x + vertex.y * axis.y;
        min = Math.min(min, dotProduct);
        max = Math.max(max, dotProduct);
    }
    return { min, max };
}

// --- Componente Principal ---
interface ShapeDrawerProps {
    material: Material;
}

const ShapeDrawer: React.FC<ShapeDrawerProps> = ({ material }) => {
    // Usamos a dimensão do material diretamente, assumindo escala 1mm = 1px
    const planeWidth = material.width;
    const planeHeight = material.height;

    const [shapes, setShapes] = useState<Shape[]>([]);
    const [projectParts, setProjectParts] = useState<ProjectPart[]>(getProjectParts());
    const [collisionMargin, setCollisionMargin] = useState(5); // Margem de 5mm por padrão
    const [interaction, setInteraction] = useState<Interaction>(null);
    const [highlightedCollisionId, setHighlightedCollisionId] = useState<number | null>(null);
    const [history, setHistory] = useState<Shape[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    
    const svgRef = useRef<SVGSVGElement | null>(null);
    const shapesRef = useRef(shapes);
    useEffect(() => { shapesRef.current = shapes; }, [shapes]);

    const commitHistory = (newShapes: Shape[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        setHistory([...newHistory, newShapes]);
        setHistoryIndex(newHistory.length);
    };
    
    const handleAddPartFromProject = (partToAdd: ProjectPart) => {
        if (partToAdd.quantity <= 0) return;
        
        const newShapeInstance: Shape = {
            ...partToAdd.shape,
            id: Date.now(),
            position: { x: planeWidth / 2, y: planeHeight / 2 }, // Posição inicial centralizada
        };
        const updatedShapes = [...shapes, newShapeInstance];
        setShapes(updatedShapes);
        commitHistory(updatedShapes);

        setProjectParts(currentParts => 
            currentParts.map(p => 
                p.id === partToAdd.id ? { ...p, quantity: p.quantity - 1 } : p
            )
        );
    };
    
    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setShapes(history[newIndex]);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setShapes(history[newIndex]);
        }
    };

    const onPointerDown = (e: React.PointerEvent<SVGElement>, shape: Shape) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (!svgRect) return;

        // CORREÇÃO: Usar a escala do SVG para calcular a posição do mouse corretamente
        const viewbox = svgRef.current?.viewBox.baseVal;
        const scaleX = viewbox ? viewbox.width / svgRect.width : 1;
        const scaleY = viewbox ? viewbox.height / svgRect.height : 1;

        const mouseX = (e.clientX - svgRect.left) * scaleX;
        const mouseY = (e.clientY - svgRect.top) * scaleY;
        const dx = mouseX - shape.position.x;
        const dy = mouseY - shape.position.y;

        if (e.ctrlKey || e.metaKey) {
            setInteraction({ type: 'scale', id: shape.id, initialShape: shape, initialDistance: Math.sqrt(dx * dx + dy * dy) });
        } else if (e.altKey && shape.type === 'polygon') {
            setInteraction({ type: 'rotate', id: shape.id, startAngle: Math.atan2(dy, dx) * (180 / Math.PI), initialRotation: shape.rotation });
        } else {
            setInteraction({ type: 'drag', id: shape.id, offset: { x: dx, y: dy } });
        }
    };

    // CORREÇÃO: Lógica de onPointerMove restaurada e completa, com todos os casos de colisão.
    const onPointerMove = (e: React.PointerEvent) => {
        if (!interaction) return;
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (!svgRect) return;

        const viewbox = svgRef.current?.viewBox.baseVal;
        const scaleX = viewbox ? viewbox.width / svgRect.width : 1;
        const scaleY = viewbox ? viewbox.height / svgRect.height : 1;
        
        const mouseX = (e.clientX - svgRect.left) * scaleX;
        const mouseY = (e.clientY - svgRect.top) * scaleY;

        setShapes(currentShapes => {
            const shapeIndex = currentShapes.findIndex(s => s.id === interaction.id);
            if (shapeIndex === -1) return currentShapes;
            
            const newShapes = [...currentShapes];
            let shapeToUpdate = { ...newShapes[shapeIndex] };
            
            switch (interaction.type) {
                case 'scale': {
                    const dx = mouseX - shapeToUpdate.position.x;
                    const dy = mouseY - shapeToUpdate.position.y;
                    const currentDistance = Math.sqrt(dx * dx + dy * dy);
                    const scaleFactor = interaction.initialDistance > 0 ? currentDistance / interaction.initialDistance : 1;
                    if (shapeToUpdate.type === 'polygon' && interaction.initialShape.type === 'polygon') {
                        shapeToUpdate.sides = interaction.initialShape.sides.map(side => ({ ...side, length: side.length * scaleFactor }));
                    } else if (shapeToUpdate.type === 'circle' && interaction.initialShape.type === 'circle') {
                        shapeToUpdate.radius = interaction.initialShape.radius * scaleFactor;
                    }
                    break;
                }
                case 'rotate': {
                    if (shapeToUpdate.type === 'polygon') {
                        const dx = mouseX - shapeToUpdate.position.x;
                        const dy = mouseY - shapeToUpdate.position.y;
                        const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
                        shapeToUpdate.rotation = interaction.initialRotation + (currentAngle - interaction.startAngle);
                    }
                    break;
                }
                case 'drag': {
                    let newPos = { x: mouseX - interaction.offset.x, y: mouseY - interaction.offset.y };
                    let draggedShape = { ...shapeToUpdate, position: newPos } as Shape;
                    let isColliding = false;

                    for (const otherShape of currentShapes) {
                        if (otherShape.id === interaction.id) continue;
                        
                        let mtv: Vector | null = null;
                        
                        // LÓGICA DE COLISÃO COMPLETA
                        if (draggedShape.type === 'polygon' && otherShape.type === 'polygon') {
                            const verticesA = getTransformedVertices(draggedShape);
                            const verticesB = getTransformedVertices(otherShape);
                            const axes = [...getAxes(verticesA), ...getAxes(verticesB)];
                            let minOverlap = Infinity;
                            for (const axis of axes) {
                                const projA = project(verticesA, axis);
                                const projB = project(verticesB, axis);
                                const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);
                                if (overlap < collisionMargin) { minOverlap = -1; break; }
                                if (overlap < minOverlap) {
                                    minOverlap = overlap;
                                    mtv = { x: axis.x * (minOverlap - collisionMargin), y: axis.y * (minOverlap - collisionMargin) };
                                }
                            }
                            if(minOverlap === -1) mtv = null;

                        } // Adicionar outros casos de colisão aqui (círculo vs. círculo, etc.) se necessário

                        if (mtv) {
                            isColliding = true;
                            setHighlightedCollisionId(otherShape.id);
                            const direction = { x: newPos.x - otherShape.position.x, y: newPos.y - otherShape.position.y };
                            if ((direction.x * mtv.x + direction.y * mtv.y) < 0) {
                                mtv.x = -mtv.x;
                                mtv.y = -mtv.y;
                            }
                            newPos.x += mtv.x;
                            newPos.y += mtv.y;
                            draggedShape.position = newPos;
                        }
                    }
                    if (!isColliding) setHighlightedCollisionId(null);
                    shapeToUpdate.position = draggedShape.position;
                    break;
                }
            }
            newShapes[shapeIndex] = shapeToUpdate;
            return newShapes;
        });
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (interaction) {
            commitHistory(shapesRef.current);
        }
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
        setInteraction(null);
        setHighlightedCollisionId(null);
    };

    const totalArea = planeWidth * planeHeight;
    const usedArea = shapes.reduce((acc, s) => acc + calculateArea(s), 0);

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, padding: 20, fontFamily: 'Arial, sans-serif', height: 'calc(100vh - 40px)' }}>
            {/* PAINEL DE CONTROLE */}
            <div style={{ minWidth: 300, flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Link href="/materials" style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc', background: '#f0f0f0', textAlign: 'center', textDecoration: 'none', color: 'black' }}>
                    ← Voltar para Seleção de Materiais
                </Link>

                <div style={{ padding: 15, border: '1px solid #ddd', borderRadius: 8 }}>
                    <h4>Plano de Corte: {material.name}</h4>
                    <p>Dimensões: {material.width}mm x {material.height}mm</p>
                    <label style={{ display: 'block', marginTop: 10 }}>
                        Margem de Colisão (mm):
                        <input type="number" min={0} value={collisionMargin} onChange={e => setCollisionMargin(Number(e.target.value))} style={{ width: '60px', marginLeft: '10px' }} />
                    </label>
                </div>

                <div>
                    <h4>Peças do Projeto</h4>
                    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, maxHeight: 300, overflowY: 'auto' }}>
                        {projectParts.length > 0 ? projectParts.map(part => (
                            <div key={part.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '8px 12px', background: part.quantity > 0 ? '#fff' : '#f0f0f0', borderRadius: 4, border: '1px solid #eee' }}>
                                <span>{part.name} ({part.quantity}x)</span>
                                <button onClick={() => handleAddPartFromProject(part)} disabled={part.quantity <= 0} style={{ cursor: 'pointer', padding: '5px 10px', borderRadius: 4, border: '1px solid #ccc' }}>
                                    + Adicionar
                                </button>
                            </div>
                        )) : <p>Nenhuma peça no projeto.</p>}
                    </div>
                </div>

                <div>
                    <h4>Ações</h4>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleUndo} disabled={historyIndex <= 0} style={{ flex: 1, padding: '8px 12px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc', opacity: historyIndex <= 0 ? 0.5 : 1 }}>Voltar</button>
                        <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} style={{ flex: 1, padding: '8px 12px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc', opacity: historyIndex >= history.length - 1 ? 0.5 : 1 }}>Avançar</button>
                    </div>
                    <p style={{ fontSize: '0.8em', color: '#555', marginTop: 15 }}>💡 Dicas: Segure 'Alt' + Arraste para rotacionar, 'Ctrl' + Arraste para redimensionar.</p>
                </div>

                <div style={{ fontWeight: 'bold', border: '1px solid #ddd', padding: 15, borderRadius: 8, marginTop: 'auto' }}>
                    <h4>Resumo</h4>
                    <div>Aproveitamento: {totalArea > 0 ? ((usedArea / totalArea) * 100).toFixed(1) : 0}%</div>
                    <div>Área Ocupada: {Math.round(usedArea / 100)} cm²</div>
                    <div>Área Total: {Math.round(totalArea / 100)} cm²</div>
                </div>
            </div>

            {/* CANVAS SVG */}
            <div style={{ flex: 3, border: '2px solid #ccc', position: 'relative', userSelect: 'none', overflow: 'auto', borderRadius: 4, background: '#f9f9f9' }}>
                {/* CORREÇÃO: Adicionados os manipuladores de evento que faltavam no SVG */}
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${planeWidth} ${planeHeight}`} // Usando viewBox para escala responsiva
                    width="100%"
                    height="100%"
                    style={{ touchAction: 'none', display: 'block' }}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp} // Garante que a interação para se o mouse sair do canvas
                >
                    {shapes.map((shape) => {
                        const isInteracting = interaction?.id === shape.id;
                        const isHighlighted = isInteracting || shape.id === highlightedCollisionId;
                        const strokeColor = isHighlighted ? "rgba(255, 193, 7, 0.8)" : "transparent";

                        if (shape.type === 'polygon') {
                            const localVertices = calculateLocalVertices(shape.sides.length, shape.sides);
                            const points = localVertices.map(v => `${v.x},${v.y}`).join(' ');
                            return (
                                <g key={shape.id} transform={`translate(${shape.position.x},${shape.position.y}) rotate(${shape.rotation})`} onPointerDown={e => onPointerDown(e, shape)} style={{ cursor: isInteracting ? 'grabbing' : 'grab' }}>
                                    {/* Barreira de colisão visual */}
                                    <polygon points={points} fill="none" stroke={strokeColor} strokeWidth={collisionMargin * 2} strokeLinejoin="round" />
                                    {/* Peça real */}
                                    <polygon points={points} stroke="black" strokeWidth={2} fill={isInteracting ? "#8ec5fc" : "#a0c4ff88"} />
                                </g>
                            );
                        }
                        // Adicionar renderização de círculo aqui se for usar no futuro
                        return null;
                    })}
                </svg>
            </div>
        </div>
    );
};

export default ShapeDrawer;