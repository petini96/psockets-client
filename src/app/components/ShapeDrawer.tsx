"use client"
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Material, Shape, PolygonShape, Interaction, Vector, Side, Unit, Projection, ProjectPart } from '@/app/lib/types';
import { getProjectParts } from '@/app/lib/parts-data';

// --- Funções de Geometria e Colisão (sem alterações) ---
const unitToPx = (value: number, unit: Unit): number => { switch (unit) { case 'mm': return value; case 'cm': return value * 10; case 'm': return value * 1000; default: return value; }};
function calculateLocalVertices(sides: number, sidesLengths: Side[]): Vector[] { if (sides < 3) return []; if (sides === 4 && sidesLengths.length === 4) { const h = unitToPx(sidesLengths[0].length, sidesLengths[0].unit) / 2; const w = unitToPx(sidesLengths[1].length, sidesLengths[1].unit) / 2; return [{ x: -w, y: -h },{ x: w, y: -h },{ x: w, y: h },{ x: -w, y: h }]; } const avgLengthPx = sidesLengths.reduce((acc, s) => acc + unitToPx(s.length, s.unit), 0) / sides; const radius = avgLengthPx / (2 * Math.sin(Math.PI / sides)); const points: Vector[] = []; for (let i = 0; i < sides; i++) { const angle = (2 * Math.PI * i) / sides - Math.PI / 2; points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) }); } return points; }
function calculateArea(shape: Shape): number { if (shape.type === 'circle') { const radiusPx = unitToPx(shape.radius, shape.unit); return Math.PI * radiusPx * radiusPx; } if (shape.sides.length === 4) { const height = unitToPx(shape.sides[0].length, shape.sides[0].unit); const width = unitToPx(shape.sides[1].length, shape.sides[1].unit); return width * height; } if (shape.sides.length < 3) return 0; const avgLengthPx = shape.sides.reduce((acc, s) => acc + unitToPx(s.length, s.unit), 0) / shape.sides.length; return (shape.sides.length * avgLengthPx * avgLengthPx) / (4 * Math.tan(Math.PI / shape.sides.length)); }
function getTransformedVertices(poly: PolygonShape): Vector[] { const localVertices = calculateLocalVertices(poly.sides.length, poly.sides); const angleRad = poly.rotation * (Math.PI / 180); const cos = Math.cos(angleRad); const sin = Math.sin(angleRad); return localVertices.map(v => ({ x: (v.x * cos - v.y * sin) + poly.position.x, y: (v.x * sin + v.y * cos) + poly.position.y, })); }
function getAxes(vertices: Vector[]): Vector[] { const axes: Vector[] = []; for (let i = 0; i < vertices.length; i++) { const p1 = vertices[i]; const p2 = vertices[i + 1] || vertices[0]; const edge = { x: p2.x - p1.x, y: p2.y - p1.y }; const normal = { x: -edge.y, y: edge.x }; const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y); if(length > 0) axes.push({ x: normal.x / length, y: normal.y / length }); } return axes; }
function project(vertices: Vector[], axis: Vector): Projection { let min = Infinity, max = -Infinity; for (const vertex of vertices) { const dotProduct = vertex.x * axis.x + vertex.y * axis.y; min = Math.min(min, dotProduct); max = Math.max(max, dotProduct); } return { min, max }; }

const Grid: React.FC<{ width: number; height: number; gridSize: number }> = ({ width, height, gridSize }) => {
    let d = '';
    for (let x = 0; x <= width; x += gridSize) { d += `M${x},0 V${height} `; }
    for (let y = 0; y <= height; y += gridSize) { d += `M0,${y} H${width} `; }
    return <path d={d} fill="none" stroke="#dcdcdc" strokeWidth="0.5" />;
};

interface ShapeDrawerProps { material: Material; }

const ShapeDrawer: React.FC<ShapeDrawerProps> = ({ material }) => {
    const planeWidth = material.width;
    const planeHeight = material.height;

    const [shapes, setShapes] = useState<Shape[]>([]);
    const [projectParts, setProjectParts] = useState<ProjectPart[]>(getProjectParts());
    const [collisionMargin, setCollisionMargin] = useState(4);
    const [interaction, setInteraction] = useState<Interaction>(null);
    const [highlightedCollisionId, setHighlightedCollisionId] = useState<number | null>(null);
    const [history, setHistory] = useState<Shape[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [showGrid, setShowGrid] = useState(true);
    
    const svgRef = useRef<SVGSVGElement | null>(null);
    const shapesRef = useRef(shapes);
    useEffect(() => { shapesRef.current = shapes; }, [shapes]);

    const commitHistory = (newShapes: Shape[]) => { const newHistory = history.slice(0, historyIndex + 1); setHistory([...newHistory, newShapes]); setHistoryIndex(newHistory.length); };
    const handleAddPartFromProject = (partToAdd: ProjectPart) => { if (partToAdd.quantity <= 0) return; const newShapeInstance: Shape = { ...partToAdd.shape, id: Date.now() + Math.random(), position: { x: planeWidth / 2, y: planeHeight / 2 }, }; const updatedShapes = [...shapes, newShapeInstance]; setShapes(updatedShapes); commitHistory(updatedShapes); setProjectParts(currentParts => currentParts.map(p => p.id === partToAdd.id ? { ...p, quantity: p.quantity - 1 } : p)); };
    const handleUndo = () => { if (historyIndex > 0) { const newIndex = historyIndex - 1; setHistoryIndex(newIndex); setShapes(history[newIndex]); } };
    const handleRedo = () => { if (historyIndex < history.length - 1) { const newIndex = historyIndex + 1; setHistoryIndex(newIndex); setShapes(history[newIndex]); } };
    
    // --- LÓGICA DE INTERAÇÃO COMPLETA ---
    const onPointerDown = (e: React.PointerEvent<SVGElement>, shape: Shape) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (!svgRect) return;
        
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
                        }

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

    // --- RENDERIZAÇÃO ---
    const totalArea = planeWidth * planeHeight;
    const usedArea = shapes.reduce((acc, s) => acc + calculateArea(s), 0);
    const filteredParts = projectParts.filter(part => part.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const controlPanelStyles: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' };
    const h4Styles: React.CSSProperties = { color: '#6d4c41', borderBottom: '2px solid #f0eade', paddingBottom: 10, marginBottom: 15 };
    const buttonStyles: React.CSSProperties = { flex: 1, padding: '10px 12px', cursor: 'pointer', borderRadius: 8, border: '1px solid #d7ccc8', background: '#efebe9', color: '#6d4c41', fontWeight: 500, transition: 'background 0.2s' };
    
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 25, padding: 25, height: 'calc(100vh - 50px)' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={controlPanelStyles}>
                    <h4 style={h4Styles}>📋 {material.name}</h4>
                    <p>Dimensões: {material.width}mm x {material.height}mm</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 15 }}>
                      <label>Lâmina (mm):</label>
                      <input type="number" min={0} value={collisionMargin} onChange={e => setCollisionMargin(Number(e.target.value))} style={{ width: '60px', padding: '5px 8px', borderRadius: 6, border: '1px solid #ccc' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                      <input type="checkbox" id="showGrid" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} />
                      <label htmlFor="showGrid">Exibir Grade</label>
                    </div>
                </div>

                <div style={controlPanelStyles}>
                    <h4 style={h4Styles}>🧩 Peças do Projeto</h4>
                    <input type="text" placeholder="🔎 Buscar peça..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ccc', marginBottom: 15 }} />
                    <div style={{ maxHeight: 250, overflowY: 'auto', paddingRight: 10 }}>
                        {filteredParts.length > 0 ? filteredParts.map(part => (
                            <div key={part.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '8px 12px', background: part.quantity > 0 ? '#fafafa' : '#f0f0f0', borderRadius: 6, border: '1px solid #eee' }}>
                                <span>{part.name} ({part.quantity}x)</span>
                                <button onClick={() => handleAddPartFromProject(part)} disabled={part.quantity <= 0} style={{ cursor: 'pointer', padding: '5px 10px', borderRadius: 6, border: '1px solid #ccc' }}>+ Add</button>
                            </div>
                        )) : <p style={{textAlign: 'center', color: '#999'}}>Nenhuma peça encontrada.</p>}
                    </div>
                </div>
                
                <div style={{...controlPanelStyles, marginTop: 'auto' }}>
                    <h4 style={h4Styles}>⚙️ Ações</h4>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={handleUndo} disabled={historyIndex <= 0} style={{...buttonStyles, opacity: historyIndex <= 0 ? 0.6 : 1 }}>Voltar</button>
                        <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} style={{...buttonStyles, opacity: historyIndex >= history.length - 1 ? 0.6 : 1 }}>Avançar</button>
                    </div>
                     <Link href="/materials" style={{ display: 'block', textAlign: 'center', marginTop: 15, color: '#8d6e63', textDecoration: 'none' }}>← Mudar Material</Link>
                </div>
                
                <div style={{...controlPanelStyles, textAlign:'center'}}>
                     <h4>📊 Resumo</h4>
                     <div>Aproveitamento: <strong>{totalArea > 0 ? ((usedArea / totalArea) * 100).toFixed(1) : 0}%</strong></div>
                </div>
            </div>

            <div style={{ border: '2px solid #d7ccc8', position: 'relative', userSelect: 'none', overflow: 'hidden', borderRadius: 12, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <svg ref={svgRef} viewBox={`0 0 ${planeWidth} ${planeHeight}`} width="100%" height="100%" style={{ touchAction: 'none', display: 'block' }} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
                    {showGrid && <Grid width={planeWidth} height={planeHeight} gridSize={50} />}
                    {shapes.map((shape) => {
                        const isInteracting = interaction?.id === shape.id;
                        const isHighlighted = isInteracting || shape.id === highlightedCollisionId;
                        const strokeColor = isHighlighted ? "rgba(255, 167, 38, 0.9)" : "transparent";

                        if (shape.type === 'polygon') {
                            const localVertices = calculateLocalVertices(shape.sides.length, shape.sides);
                            const points = localVertices.map(v => `${v.x},${v.y}`).join(' ');
                            const width = Math.round(unitToPx(shape.sides[1].length, shape.sides[1].unit));
                            const height = Math.round(unitToPx(shape.sides[0].length, shape.sides[0].unit));
                            return (
                                <g key={shape.id} transform={`translate(${shape.position.x},${shape.position.y}) rotate(${shape.rotation})`} onPointerDown={e => onPointerDown(e, shape)} style={{ cursor: isInteracting ? 'grabbing' : 'grab' }}>
                                    <polygon points={points} fill="none" stroke={strokeColor} strokeWidth={collisionMargin * 2} strokeLinejoin="round" />
                                    <polygon points={points} stroke="#5d4037" strokeWidth={1.5} fill={isInteracting ? "rgba(141, 110, 99, 0.6)" : "rgba(141, 110, 99, 0.4)"} />
                                    <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="16px" fontWeight="500" style={{ pointerEvents: 'none' }}>
                                        {`${width}x${height}`}
                                    </text>
                                </g>
                            );
                        }
                        return null;
                    })}
                </svg>
            </div>
        </div>
    );
};

export default ShapeDrawer;