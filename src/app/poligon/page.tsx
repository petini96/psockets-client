"use client"
import React, { useState, useEffect, useRef } from 'react';

// --- Tipos e Interfaces ---
type Unit = 'mm' | 'cm' | 'm';
type ShapeType = 'polygon' | 'circle';

interface Vector {
    x: number;
    y: number;
}

interface BaseShape {
    id: number;
    type: ShapeType;
    position: Vector;
}

interface PolygonShape extends BaseShape {
    type: 'polygon';
    sides: Side[];
    rotation: number;
}

interface CircleShape extends BaseShape {
    type: 'circle';
    radius: number;
    unit: Unit;
}

type Shape = PolygonShape | CircleShape;

interface Side {
    length: number;
    unit: Unit;
}

// Tipos para Interação do Usuário
type Interaction =
    | { type: 'drag'; id: number; offset: Vector }
    | { type: 'rotate'; id: number; startAngle: number; initialRotation: number }
    | { type: 'scale'; id: number; initialShape: Shape; initialDistance: number }
    | null;

// --- Funções de Cálculo Geométrico ---
const unitToPx = (value: number, unit: Unit): number => {
    switch (unit) {
        case 'mm': return value * 3.78;
        case 'cm': return value * 37.8;
        case 'm': return value * 3780;
        default: return value;
    }
};

function calculateLocalVertices(sides: number, sidesLengths: Side[]): Vector[] {
    if (sides < 3) return [];
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
    if (shape.sides.length < 3) return 0;
    const avgLengthPx = shape.sides.reduce((acc, s) => acc + unitToPx(s.length, s.unit), 0) / shape.sides.length;
    return (shape.sides.length * avgLengthPx * avgLengthPx) / (4 * Math.tan(Math.PI / shape.sides.length));
}

// --- Lógica de Colisão (SAT) ---
interface Projection { min: number; max: number; }

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
        axes.push({ x: normal.x / length, y: normal.y / length });
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

// --- Componente React ---
const ShapeDrawerSVG: React.FC = () => {
    // Estados do Plano e Formas
    const [planeWidth, setPlaneWidth] = useState(800);
    const [planeHeight, setPlaneHeight] = useState(600);
    const [shapes, setShapes] = useState<Shape[]>([]);
    const [collisionMargin, setCollisionMargin] = useState(10);
    const [showAllBarriers, setShowAllBarriers] = useState(true);

    // Estados para criação de novas formas
    const [currentShapeType, setCurrentShapeType] = useState<ShapeType>('polygon');
    const [currentSides, setCurrentSides] = useState(3);
    const [currentSidesLengths, setCurrentSidesLengths] = useState<Side[]>([{ length: 5, unit: 'cm' }, { length: 5, unit: 'cm' }, { length: 5, unit: 'cm' }]);
    const [currentCircleRadius, setCurrentCircleRadius] = useState(5);
    const [currentCircleUnit, setCurrentCircleUnit] = useState<Unit>('cm');

    // Estados de Interação e Histórico
    const [interaction, setInteraction] = useState<Interaction>(null);
    const [highlightedCollisionId, setHighlightedCollisionId] = useState<number | null>(null);
    const [history, setHistory] = useState<Shape[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    
    const svgRef = useRef<SVGSVGElement | null>(null);
    const shapesRef = useRef(shapes);
    useEffect(() => { shapesRef.current = shapes; }, [shapes]);

    useEffect(() => {
        setCurrentSidesLengths((old) => {
            const newSides = [...old];
            while (newSides.length < currentSides) newSides.push({ length: 5, unit: 'cm' });
            return newSides.slice(0, currentSides);
        });
    }, [currentSides]);

    const commitHistory = (newShapes: Shape[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        setHistory([...newHistory, newShapes]);
        setHistoryIndex(newHistory.length);
    };

    const handleAddShape = () => {
        const newShape: Shape = currentShapeType === 'polygon'
            ? { id: Date.now(), type: 'polygon', sides: [...currentSidesLengths], position: { x: planeWidth / 2, y: planeHeight / 2 }, rotation: 0 }
            : { id: Date.now(), type: 'circle', radius: currentCircleRadius, unit: currentCircleUnit, position: { x: planeWidth / 2, y: planeHeight / 2 } };
        const updatedShapes = [...shapes, newShape];
        setShapes(updatedShapes);
        commitHistory(updatedShapes);
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

        const mouseX = e.clientX - svgRect.left;
        const mouseY = e.clientY - svgRect.top;
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

    const onPointerMove = (e: React.PointerEvent) => {
        if (!interaction) return;
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (!svgRect) return;
        const mouseX = e.clientX - svgRect.left;
        const mouseY = e.clientY - svgRect.top;

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

                    if (shapeToUpdate.type === 'circle' && interaction.initialShape.type === 'circle') {
                        shapeToUpdate.radius = interaction.initialShape.radius * scaleFactor;
                    } else if (shapeToUpdate.type === 'polygon' && interaction.initialShape.type === 'polygon') {
                        shapeToUpdate.sides = interaction.initialShape.sides.map(side => ({ ...side, length: side.length * scaleFactor }));
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
                    let draggedShape = { ...shapeToUpdate, position: newPos };
                    let isColliding = false;

                    for (const otherShape of currentShapes) {
                        if (otherShape.id === interaction.id) continue;
                        
                        let mtv: Vector | null = null;
                        
                        // --- INÍCIO DA LÓGICA DE COLISÃO ---
                        if (draggedShape.type === 'polygon' && otherShape.type === 'polygon') {
                            const verticesA = getTransformedVertices(draggedShape);
                            const verticesB = getTransformedVertices(otherShape);
                            const axes = [...getAxes(verticesA), ...getAxes(verticesB)];
                            let minOverlap = Infinity;

                            for (const axis of axes) {
                                const projA = project(verticesA, axis);
                                const projB = project(verticesB, axis);
                                const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min) + collisionMargin;
                                if (overlap <= 0) { minOverlap = -1; break; }
                                if (overlap < minOverlap) {
                                    minOverlap = overlap;
                                    mtv = { x: axis.x * minOverlap, y: axis.y * minOverlap };
                                }
                            }
                            if(minOverlap === -1) mtv = null;

                        } else if (draggedShape.type === 'circle' && otherShape.type === 'circle') {
                            const r1 = unitToPx(draggedShape.radius, draggedShape.unit);
                            const r2 = unitToPx(otherShape.radius, otherShape.unit);
                            const minDistance = r1 + r2 + collisionMargin;
                            const dx = newPos.x - otherShape.position.x;
                            const dy = newPos.y - otherShape.position.y;
                            const distance = Math.sqrt(dx*dx + dy*dy);
                            if (distance < minDistance) {
                                const overlap = minDistance - distance;
                                mtv = { x: (dx / distance) * overlap, y: (dy / distance) * overlap };
                            }

                        } else {
                            const poly = (draggedShape.type === 'polygon' ? draggedShape : otherShape) as PolygonShape;
                            const circle = (draggedShape.type === 'circle' ? draggedShape : otherShape) as CircleShape;
                            const circleRadius = unitToPx(circle.radius, circle.unit);
                            const vertices = getTransformedVertices(poly);
                            const axes = getAxes(vertices);
                            let minOverlap = Infinity;

                            let closestVertexDist = Infinity;
                            let closestVertex: Vector | null = null;
                            for(const v of vertices) {
                                const dist = Math.sqrt(Math.pow(v.x - circle.position.x, 2) + Math.pow(v.y - circle.position.y, 2));
                                if(dist < closestVertexDist) {
                                    closestVertexDist = dist;
                                    closestVertex = v;
                                }
                            }
                            if (closestVertex) {
                                const axisToClosest = { x: closestVertex.x - circle.position.x, y: closestVertex.y - circle.position.y };
                                const len = Math.sqrt(axisToClosest.x * axisToClosest.x + axisToClosest.y * axisToClosest.y);
                                if (len > 0) axes.push({ x: axisToClosest.x / len, y: axisToClosest.y / len });
                            }

                            for (const axis of axes) {
                                const projP = project(vertices, axis);
                                const projCcenter = circle.position.x * axis.x + circle.position.y * axis.y;
                                const projC = { min: projCcenter - circleRadius, max: projCcenter + circleRadius };
                                const overlap = Math.min(projP.max, projC.max) - Math.max(projP.min, projC.min) + collisionMargin;
                                if (overlap <= 0) { minOverlap = -1; break; }
                                if (overlap < minOverlap) {
                                    minOverlap = overlap;
                                    mtv = { x: axis.x * minOverlap, y: axis.y * minOverlap };
                                }
                            }
                            if(minOverlap === -1) mtv = null;
                        }

                        if (mtv) {
                            isColliding = true;
                            setHighlightedCollisionId(otherShape.id);
                            const direction = { x: newPos.x - otherShape.position.x, y: newPos.y - otherShape.position.y };
                            if (direction.x * mtv.x + direction.y * mtv.y < 0) {
                                mtv.x = -mtv.x;
                                mtv.y = -mtv.y;
                            }
                            newPos.x += mtv.x;
                            newPos.y += mtv.y;
                            draggedShape.position = newPos; // Atualiza a posição para a próxima iteração
                        }
                        // --- FIM DA LÓGICA DE COLISÃO ---
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, padding: 20, fontFamily: 'Arial, sans-serif' }}>
            <div style={{ minWidth: 280, flex: 1 }}>
                <h2>Configurações</h2>
                {/* Controles do plano e colisão */}
                <div style={{ marginBottom: 20, padding: 10, border: '1px solid #ddd', borderRadius: 4 }}>
                    <h4>Plano e Colisão</h4>
                    <label>Largura (px): <input type="number" min={100} value={planeWidth} onChange={e => setPlaneWidth(Number(e.target.value))} /></label>
                    <label style={{ marginLeft: 10 }}>Altura (px): <input type="number" min={100} value={planeHeight} onChange={e => setPlaneHeight(Number(e.target.value))} /></label>
                    <label style={{ display: 'block', marginTop: 10 }}>Margem (px): <input type="number" min={0} value={collisionMargin} onChange={e => setCollisionMargin(Number(e.target.value))} /></label>
                    <label style={{ display: 'block', marginTop: 10 }}><input type="checkbox" checked={showAllBarriers} onChange={e => setShowAllBarriers(e.target.checked)} /> Exibir barreiras</label>
                </div>

                {/* Controles de criação de forma */}
                <h4>Criar Forma</h4>
                <div>
                    <label><input type="radio" value="polygon" checked={currentShapeType === 'polygon'} onChange={() => setCurrentShapeType('polygon')} /> Polígono</label>
                    <label style={{ marginLeft: 10 }}><input type="radio" value="circle" checked={currentShapeType === 'circle'} onChange={() => setCurrentShapeType('circle')} /> Círculo</label>
                </div>
                {currentShapeType === 'polygon' ? (
                    <div style={{ marginTop: 10 }}>
                        <label>Nº de lados: <input type="number" min={3} max={20} value={currentSides} onChange={e => setCurrentSides(Number(e.target.value))} /></label>
                        <div style={{ marginTop: 10, maxHeight: 150, overflowY: 'auto', paddingRight: '10px' }}>
                            {currentSidesLengths.map((side, i) => (
                                <div key={i} style={{ marginTop: 8, display: 'flex', alignItems: 'center' }}>
                                    Lado {i + 1}: <input type="number" min={0.1} step={0.1} value={side.length.toFixed(1)} onChange={e => setCurrentSidesLengths(old => old.map((s, idx) => idx === i ? { ...s, length: Number(e.target.value) } : s))} style={{ width: 60, marginLeft: 5 }} />
                                    <select value={side.unit} onChange={e => setCurrentSidesLengths(old => old.map((s, idx) => idx === i ? { ...s, unit: e.target.value as Unit } : s))} style={{ marginLeft: 8 }}>
                                        <option value="mm">mm</option><option value="cm">cm</option><option value="m">m</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ marginTop: 10 }}>
                        <label>Raio: <input type="number" min={1} value={currentCircleRadius.toFixed(1)} onChange={e => setCurrentCircleRadius(Number(e.target.value))} style={{ width: 60 }} /></label>
                        <select value={currentCircleUnit} onChange={e => setCurrentCircleUnit(e.target.value as Unit)} style={{ marginLeft: 8 }}>
                            <option value="mm">mm</option><option value="cm">cm</option><option value="m">m</option>
                        </select>
                    </div>
                )}
                
                {/* Botões de Ação */}
                <button onClick={handleAddShape} style={{ marginTop: 20, padding: '8px 12px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc' }}>Adicionar Forma</button>
                <div style={{ marginTop: 15, display: 'flex', gap: '10px' }}>
                    <button onClick={handleUndo} disabled={historyIndex <= 0} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc', opacity: historyIndex <= 0 ? 0.5 : 1 }}>Voltar</button>
                    <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc', opacity: historyIndex >= history.length - 1 ? 0.5 : 1 }}>Avançar</button>
                </div>

                <p style={{ fontSize: '0.8em', color: '#555', marginTop: 15 }}>💡 **Dicas:** Segure 'Alt' para rotacionar, 'Ctrl' para redimensionar.</p>
                <div style={{ marginTop: 20, fontWeight: 'bold' }}>
                    <div>Área total: {totalArea.toFixed(0)} px²</div>
                    <div>Área ocupada: {usedArea.toFixed(0)} px²</div>
                    <div>Sobra: {(totalArea - usedArea).toFixed(0)} px²</div>
                </div>
            </div>

            {/* Canvas SVG */}
            <div style={{ flex: 2, minWidth: 300, border: '1px solid #ccc', position: 'relative', userSelect: 'none', overflow: 'hidden', borderRadius: 4 }}>
                <svg ref={svgRef} width={planeWidth} height={planeHeight} style={{ backgroundColor: '#f9f9f9', touchAction: 'none', display: 'block' }} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
                    {shapes.map((shape) => {
                        const isInteracting = interaction?.id === shape.id;
                        const isHighlighted = isInteracting || shape.id === highlightedCollisionId || showAllBarriers;
                        const strokeColor = isHighlighted ? "rgba(255, 193, 7, 0.8)" : "transparent";

                        if (shape.type === 'polygon') {
                            const localVertices = calculateLocalVertices(shape.sides.length, shape.sides);
                            const points = localVertices.map(v => `${v.x},${v.y}`).join(' ');
                            return (
                                <g key={shape.id} transform={`translate(${shape.position.x},${shape.position.y}) rotate(${shape.rotation})`} onPointerDown={e => onPointerDown(e, shape)} style={{ cursor: isInteracting ? 'grabbing' : 'grab' }}>
                                    <polygon points={points} fill="none" stroke={strokeColor} strokeWidth={collisionMargin * 2} strokeLinejoin="round" />
                                    <polygon points={points} stroke="black" strokeWidth={2} fill={isInteracting ? "#8ec5fc" : "#a0c4ff88"} />
                                </g>
                            );
                        } else { // Círculo
                            const radiusPx = unitToPx(shape.radius, shape.unit);
                            return (
                                <g key={shape.id} transform={`translate(${shape.position.x},${shape.position.y})`} onPointerDown={e => onPointerDown(e, shape)} style={{ cursor: isInteracting ? 'grabbing' : 'grab' }}>
                                    <circle cx="0" cy="0" r={radiusPx + collisionMargin} fill={strokeColor} fillOpacity="0.5" />
                                    <circle cx="0" cy="0" r={radiusPx} stroke="black" strokeWidth={2} fill={isInteracting ? "#8ec5fc" : "#a0c4ff88"} />
                                </g>
                            );
                        }
                    })}
                </svg>
            </div>
        </div>
    );
};

export default ShapeDrawerSVG;